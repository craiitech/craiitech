'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { PlusCircle, Loader2, Database, LayoutList, BarChart3, ListChecks, Filter, Copy } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import type { AuditPlan, Campus, User, Unit, AuditSchedule, ISOClause, AuditFinding } from '@/lib/types';
import { AuditPlanDialog } from './audit-plan-dialog';
import { AuditScheduleDialog } from './audit-schedule-dialog';
import { AuditPlanCloneDialog } from './audit-plan-clone-dialog';
import { AuditPlanList } from './audit-plan-list';
import { AuditAnalytics } from './audit-analytics';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function AdminAuditView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [editingPlan, setEditingPlan] = useState<AuditPlan | null>(null);
  const [isPlanDialogOpenState, setIsPlanDialogOpenState] = useState(false);

  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedPlanForScheduling, setSelectedPlanForScheduling] = useState<AuditPlan | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<AuditSchedule | null>(null);

  const [cloningPlan, setCloningPlan] = useState<AuditPlan | null>(null);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);

  const [deletingPlan, setDeletingPlan] = useState<AuditPlan | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<AuditSchedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isSeeding, setIsSeeding] = useState(false);

  // Data Fetching
  const auditPlansQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'auditPlans')) : null), [firestore]);
  const { data: auditPlans, isLoading: isLoadingPlans } = useCollection<AuditPlan>(auditPlansQuery);

  const schedulesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'auditSchedules')) : null), [firestore]);
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(schedulesQuery);
  
  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: findings, isLoading: isLoadingFindings } = useCollection<AuditFinding>(findingsQuery);

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
    setIsPlanDialogOpenState(true);
  };

  const handleEditPlan = (plan: AuditPlan) => {
    setEditingPlan(plan);
    setIsPlanDialogOpenState(true);
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

  const handleClonePlan = (plan: AuditPlan) => {
    setCloningPlan(plan);
    setIsCloneDialogOpen(true);
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
            description: 'Please trigger the seeding again.',
            variant: 'destructive',
        });
    } finally {
        setIsSeeding(false);
    }
  }
  
  const isLoading = isLoadingPlans || isLoadingCampuses || isLoadingUsers || isLoadingUnits || isLoadingSchedules || isLoadingClauses || isLoadingFindings;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <LayoutList className="h-6 w-6 text-primary" />
              IQA Strategic Planning
          </h2>
          <p className="text-muted-foreground font-medium">Analyze results and manage the institutional audit itinerary.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 flex items-center gap-1">
                    <Filter className="h-2.5 w-2.5" /> Audit Cycle Year
                </label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[140px] h-9 bg-white font-bold shadow-sm">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {yearsList.map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleNewPlan} disabled={isLoadingClauses && !isoClauses} className="h-9 mt-5 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Audit Plan
            </Button>
        </div>
      </div>

      {!isLoadingClauses && (!isoClauses || isoClauses.length === 0) && (
          <Alert className="border-amber-200 bg-amber-50">
              <Database className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 font-bold">Standard Clauses Missing</AlertTitle>
              <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-700 mt-2">
                  <span>The ISO 21001:2018 Clause database is empty. This is required for auditing.</span>
                  <Button variant="outline" size="sm" onClick={handleSeedClauses} disabled={isSeeding} className="bg-white">
                      {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
                      Seed Clauses
                  </Button>
              </AlertDescription>
          </Alert>
      )}

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="analytics" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <BarChart3 className="h-3.5 w-3.5" /> Audit Intelligence
            </TabsTrigger>
            <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <ListChecks className="h-3.5 w-3.5" /> Itinerary Management
            </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="animate-in fade-in duration-500">
            <AuditAnalytics 
                plans={auditPlans || []}
                schedules={schedules || []}
                findings={findings || []}
                isoClauses={isoClauses || []}
                units={units || []}
                campuses={campuses || []}
                users={users || []}
                isLoading={isLoading}
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="registry" className="animate-in fade-in duration-500">
            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-widest">University Internal Quality Audit (IQA) Registry</CardTitle>
                        <Badge variant="outline" className="h-5 text-[10px] font-black bg-white uppercase">AY {selectedYear} Session Log</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex flex-col justify-center items-center h-64 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Synchronizing Registry...</p>
                        </div>
                    ) : (
                        <AuditPlanList 
                            plans={auditPlans?.filter(p => p.year === selectedYear) || []}
                            schedules={schedules || []}
                            findings={findings || []}
                            isoClauses={isoClauses || []}
                            campuses={campuses || []}
                            users={users || []}
                            units={units || []}
                            onEditPlan={handleEditPlan}
                            onDeletePlan={setDeletingPlan}
                            onScheduleAudit={handleScheduleAudit}
                            onEditSchedule={handleEditSchedule}
                            onDeleteSchedule={setDeletingSchedule}
                            onClonePlan={handleClonePlan}
                        />
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AuditPlanDialog isOpen={isPlanDialogOpenState} onOpenChange={setIsPlanDialogOpenState} plan={editingPlan} campuses={campuses || []} />
      
      {isScheduleDialogOpen && selectedPlanForScheduling && (
        <AuditScheduleDialog
            isOpen={isScheduleDialogOpen}
            onOpenChange={setIsScheduleDialogOpen}
            plan={selectedPlanForScheduling}
            schedule={editingSchedule}
            allSchedules={schedules || []}
            auditors={users?.filter(u => u.role === 'Auditor') || []}
            allUnits={units || []}
            topManagement={users?.filter(u => u.role?.toLowerCase().includes('president') || u.role?.toLowerCase().includes('director')) || []}
        />
      )}

      {cloningPlan && (
          <AuditPlanCloneDialog
            isOpen={isCloneDialogOpen}
            onOpenChange={setIsCloneDialogOpen}
            sourcePlan={cloningPlan}
            sourceSchedules={schedules?.filter(s => s.auditPlanId === cloningPlan.id) || []}
            campuses={campuses || []}
          />
      )}

      {/* Delete Plan Confirm */}
      <AlertDialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the institutional plan <strong>"{deletingPlan?.title}"</strong>. 
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
                    You are about to delete the audit session for <strong>{deletingSchedule?.targetName}</strong>.
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
    </div>
  );
}
