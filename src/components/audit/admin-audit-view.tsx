
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Database, LayoutList } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import type { AuditPlan, Campus, User, Unit, AuditSchedule, ISOClause } from '@/lib/types';
import { AuditPlanDialog } from './audit-plan-dialog';
import { AuditScheduleDialog } from './audit-schedule-dialog';
import { AuditPlanList } from './audit-plan-list';
import { seedIsoClausesClient } from '@/lib/iso-seeder';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * ADMIN AUDIT MANAGEMENT HUB
 * The primary workspace for establishing institutional audit frameworks.
 */
export function AdminAuditView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AuditPlan | null>(null);

  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedPlanForScheduling, setSelectedPlanForScheduling] = useState<AuditPlan | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<AuditSchedule | null>(null);

  const [deletingPlan, setDeletingPlan] = useState<AuditPlan | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<AuditSchedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isSeeding, setIsSeeding] = useState(false);

  // Data Fetching
  const auditPlansQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'auditPlans')) : null), [firestore]);
  const { data: auditPlans, isLoading: isLoadingPlans } = useCollection<AuditPlan>(auditPlansQuery);

  const schedulesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'auditSchedules')) : null), [firestore]);
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(schedulesQuery);
  
  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);
  
  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: isoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(isoClausesQuery);

  const handleNewPlan = () => {
    setEditingPlan(null);
    setIsPlanDialogOpen(true);
  };

  const handleEditPlan = (plan: AuditPlan) => {
    setEditingPlan(plan);
    setIsPlanDialogOpen(true);
  };

  const handleScheduleAudit = (plan: AuditPlan) => {
    setSelectedPlanForScheduling(plan);
    setEditingSchedule(null);
    setIsScheduleDialogOpen(true);
  };

  const handleEditSchedule = (plan: AuditPlan, schedule: AuditSchedule) => {
    setSelectedPlanForScheduling(plan);
    setEditingSchedule(schedule);
    setIsScheduleDialogOpen(true);
  };

  const handleDeletePlan = async () => {
    if (!firestore || !deletingPlan) return;
    setIsProcessing(true);
    try {
        await deleteDoc(doc(firestore, 'auditPlans', deletingPlan.id));
        toast({ title: 'Plan Removed', description: 'Institutional audit plan has been deleted.' });
        setDeletingPlan(null);
    } catch (e) {
        toast({ title: 'Error', description: 'Could not delete plan.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!firestore || !deletingSchedule) return;
    setIsProcessing(true);
    try {
        await deleteDoc(doc(firestore, 'auditSchedules', deletingSchedule.id));
        toast({ title: 'Entry Removed', description: 'Itinerary entry has been deleted.' });
        setDeletingSchedule(null);
    } catch (e) {
        toast({ title: 'Error', description: 'Could not delete entry.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleSeedClauses = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
        const result = await seedIsoClausesClient(firestore);
        toast({
            title: 'Seeding Complete',
            description: result.message,
        });
    } catch(error) {
         toast({
            title: 'Seeding Failed',
            description: 'Please trigger the seeding again. Ensure you have an active internet connection.',
            variant: 'destructive',
        });
    } finally {
        setIsSeeding(false);
    }
  }
  
  const isLoading = isLoadingPlans || isLoadingCampuses || isLoadingUsers || isLoadingUnits || isLoadingSchedules || isLoadingClauses;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <LayoutList className="h-6 w-6 text-primary" />
                IQA Strategic Planning
            </h2>
            <p className="text-muted-foreground font-medium">Create institutional audit frameworks and manage unit-level schedules.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleNewPlan} disabled={isLoadingClauses && !isoClauses} className="shadow-lg shadow-primary/20">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Audit Plan
            </Button>
          </div>
        </div>

        {/* Database Readiness Alert */}
        {!isLoadingClauses && (!isoClauses || isoClauses.length === 0) && (
            <Alert className="border-amber-200 bg-amber-50">
                <Database className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 font-bold">Standard Clauses Missing</AlertTitle>
                <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-700 mt-2">
                    <span>The ISO 21001:2018 Clause database is empty. You must seed the standard clauses before auditors can map findings during conduct.</span>
                    <Button variant="outline" size="sm" onClick={handleSeedClauses} disabled={isSeeding} className="bg-white">
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
                        Seed Standard Clauses
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle>Institutional Audit Registry</CardTitle>
            <CardDescription>Browse existing plans and manage the lifecycle of scheduled audits.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
                <div className="flex flex-col justify-center items-center h-64 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Synchronizing Registry...</p>
                </div>
            ) : (
                <AuditPlanList 
                    plans={auditPlans || []}
                    schedules={schedules || []}
                    campuses={campuses || []}
                    users={users || []}
                    units={units || []}
                    onEditPlan={handleEditPlan}
                    onDeletePlan={setDeletingPlan}
                    onScheduleAudit={handleScheduleAudit}
                    onEditSchedule={handleEditSchedule}
                    onDeleteSchedule={setDeletingSchedule}
                />
            )}
          </CardContent>
        </Card>
      </div>

      {isPlanDialogOpen && (
        <AuditPlanDialog
          isOpen={isPlanDialogOpen}
          onOpenChange={setIsPlanDialogOpen}
          plan={editingPlan}
          campuses={campuses || []}
        />
      )}

      {isScheduleDialogOpen && selectedPlanForScheduling && (
        <AuditScheduleDialog
            isOpen={isScheduleDialogOpen}
            onOpenChange={setIsScheduleDialogOpen}
            plan={selectedPlanForScheduling}
            schedule={editingSchedule}
            auditors={users?.filter(u => u.role === 'Auditor') || []}
            allUnits={units || []}
            topManagement={users?.filter(u => u.role?.toLowerCase().includes('president') || u.role?.toLowerCase().includes('director')) || []}
        />
      )}

      {/* Delete Plan Confirm */}
      <AlertDialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Remove Audit Plan?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the institutional plan <strong>"{deletingPlan?.title}"</strong>. 
                    Warning: This action will not automatically delete the itinerary entries (schedules) but will leave them without a parent plan.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abort</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive text-white" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirm Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Schedule Confirm */}
      <AlertDialog open={!!deletingSchedule} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Itinerary Entry?</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to delete the audit session for <strong>{deletingSchedule?.targetName}</strong> scheduled on {deletingSchedule?.scheduledDate?.toDate?.() ? format(deletingSchedule.scheduledDate.toDate(), 'MM/dd/yyyy') : '...'}. 
                    This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abort</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSchedule} className="bg-destructive text-white" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Delete Session
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
