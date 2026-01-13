
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Database } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { AuditPlan, Campus, User, Unit, AuditSchedule, ISOClause } from '@/lib/types';
import { AuditPlanDialog } from './audit-plan-dialog';
import { AuditScheduleDialog } from './audit-schedule-dialog';
import { AuditPlanList } from './audit-plan-list';
import { seedIsoClauses } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function AdminAuditView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AuditPlan | null>(null);

  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedPlanForScheduling, setSelectedPlanForScheduling] = useState<AuditPlan | null>(null);
  
  const [isSeeding, setIsSeeding] = useState(false);

  const auditPlansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'auditPlans')) : null, [firestore]);
  const { data: auditPlans, isLoading: isLoadingPlans } = useCollection<AuditPlan>(auditPlansQuery);

  const schedulesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'auditSchedules')) : null, [firestore]);
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(schedulesQuery);
  
  const campusesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'campuses')) : null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'units')) : null, [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const isoClausesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'isoClauses')) : null, [firestore]);
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
    setIsScheduleDialogOpen(true);
  };
  
  const handleSeedClauses = async () => {
    setIsSeeding(true);
    try {
        const result = await seedIsoClauses();
        toast({
            title: 'Seeding Complete',
            description: result.message,
        });
    } catch(error) {
         toast({
            title: 'Seeding Failed',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
            variant: 'destructive',
        });
    } finally {
        setIsSeeding(false);
    }
  }
  
  const isLoading = isLoadingPlans || isLoadingCampuses || isLoadingUsers || isLoadingUnits || isLoadingSchedules || isLoadingClauses;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Internal Quality Audit Management</h2>
            <p className="text-muted-foreground">Create and manage audit plans and schedules.</p>
          </div>
          <Button onClick={handleNewPlan} disabled={isLoadingClauses && !isoClauses}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Audit Plan
          </Button>
        </div>

        {!isLoadingClauses && (!isoClauses || isoClauses.length === 0) && (
            <Alert>
                <Database className="h-4 w-4" />
                <AlertTitle>Initial Setup Required</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>The ISO Clause database is empty. Please seed the data to enable audit scheduling.</span>
                    <Button onClick={handleSeedClauses} disabled={isSeeding}>
                        {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Seed ISO Clauses
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Audit Plans</CardTitle>
            <CardDescription>A list of all created audit plans for all campuses.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <AuditPlanList 
                    plans={auditPlans || []}
                    schedules={schedules || []}
                    campuses={campuses || []}
                    users={users || []}
                    units={units || []}
                    onEditPlan={handleEditPlan}
                    onScheduleAudit={handleScheduleAudit}
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
            auditors={users?.filter(u => u.role === 'Auditor') || []}
            allUnits={units || []}
            topManagement={users?.filter(u => u.role?.toLowerCase().includes('president')) || []}
        />
      )}
    </>
  );
}
