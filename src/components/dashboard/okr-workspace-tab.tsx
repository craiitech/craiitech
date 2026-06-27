'use client';

import { useState, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from '@/firebase/firestore-wrapper';
import { Loader2, Plus, Target, Filter, Sparkles, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OkrObjectiveCard } from '@/components/okr/okr-objective-card';
import { OkrCheckInDialog } from '@/components/okr/okr-checkin-dialog';
import { OkrCreateDialog } from '@/components/okr/okr-create-dialog';
import { useUserOkrObjectives } from '@/hooks/kpi/use-kpi-data';
import { Badge } from '@/components/ui/badge';
import { OkrWizardDialog } from '@/components/okr/okr-wizard-dialog';
import type { OkrObjective, OkrKeyResult, Submission, Risk, CorrectiveActionRequest, Unit, Cycle, AuditPlan, CsmResponse, AttendanceActivity, ActivityAttendanceLog, ActivityEvaluation } from '@/lib/types';

interface OkrWorkspaceTabProps {
  selectedYear: number;
  submissions?: Submission[] | null;
  risks?: Risk[] | null;
  cars?: CorrectiveActionRequest[] | null;
  units?: Unit[] | null;
  cycles?: Cycle[] | null;
  auditPlans?: AuditPlan[] | null;
  csmResponses?: CsmResponse[] | null;
  activities?: AttendanceActivity[] | null;
  activityLogs?: ActivityAttendanceLog[] | null;
  evaluations?: ActivityEvaluation[] | null;
}

export function OkrWorkspaceTab({
  selectedYear,
  submissions = null, risks = null, cars = null, units = null,
  cycles = null, auditPlans = null, csmResponses = null,
  activities = null, activityLogs = null, evaluations = null,
}: OkrWorkspaceTabProps) {
  const { isAdmin, isSupervisor, userProfile } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('my-okrs');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState('all');

  const canCreate = isAdmin || isSupervisor;

  const objectivesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'okrObjectives'), where('year', '==', selectedYear));
  }, [firestore, selectedYear]);

  const { data: allObjectives, isLoading } = useCollection<OkrObjective>(objectivesQuery);

  const { data: userObjectives } = useUserOkrObjectives(userProfile?.id || '');

  const keyResultsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'okrKeyResults'));
  }, [firestore]);

  const { data: allKeyResults } = useCollection<OkrKeyResult>(keyResultsQuery);

  const filteredObjectives = useMemo(() => {
    if (!allObjectives) return [];
    let filtered = allObjectives;
    if (activeTab === 'my-okrs' && userProfile?.id) {
      filtered = filtered.filter(o => o.ownerId === userProfile.id);
    }
    if (activeTab === 'my-okrs' && entityFilter !== 'all') {
      filtered = filtered.filter(o => o.entityType === entityFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    return filtered;
  }, [allObjectives, activeTab, userProfile?.id, entityFilter, statusFilter]);

  const displayObjectives = useMemo(() => {
    if (!allObjectives && !userObjectives) return [];
    const source = activeTab === 'my-okrs' && filteredObjectives.length === 0
      ? (userObjectives || [])
      : filteredObjectives;
    return [...source].sort((a, b) => (b.year || 0) - (a.year || 0));
  }, [allObjectives, filteredObjectives, userObjectives, activeTab]);

  const objectiveKeyResultsMap = useMemo(() => {
    const map = new Map<string, OkrKeyResult[]>();
    if (!allKeyResults) return map;
    for (const kr of allKeyResults) {
      const existing = map.get(kr.objectiveId);
      if (existing) existing.push(kr);
      else map.set(kr.objectiveId, [kr]);
    }
    return map;
  }, [allKeyResults]);

  const selectedObjective = useMemo(() => {
    return allObjectives?.find(o => o.id === selectedObjectiveId) || null;
  }, [allObjectives, selectedObjectiveId]);

  const selectedKeyResults = useMemo(() => {
    return objectiveKeyResultsMap.get(selectedObjectiveId || '') || [];
  }, [objectiveKeyResultsMap, selectedObjectiveId]);

  const handleCheckIn = useCallback((objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
    setIsCheckInOpen(true);
  }, []);

  const handleClick = useCallback((objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
    setIsCheckInOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs font-bold">
              <Filter className="h-3 w-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[9px] font-black">
            {displayObjectives.length} Objectives
          </Badge>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsWizardOpen(true)} className="h-8 text-xs font-bold">
              <BrainCircuit className="h-3.5 w-3.5 mr-1.5" /> Wizard
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="h-8 text-xs font-bold">
              <Plus className="h-4 w-4 mr-1.5" /> New OKR
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-okrs"><Target className="h-3.5 w-3.5 mr-1.5" /> My OKRs</TabsTrigger>
          <TabsTrigger value="all-okrs">All Objectives</TabsTrigger>
        </TabsList>

        <TabsContent value="my-okrs" className="mt-4">
          {displayObjectives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-bold text-muted-foreground">No OKRs yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {canCreate ? 'Create your first OKR to start tracking goals.' : 'No objectives assigned to you yet.'}
              </p>
              {canCreate && (
                <Button onClick={() => setIsCreateOpen(true)} className="mt-4 text-xs font-bold">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Create OKR
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayObjectives.map(obj => (
                <OkrObjectiveCard
                  key={obj.id}
                  objective={obj}
                  keyResults={objectiveKeyResultsMap.get(obj.id) || []}
                  onCheckIn={handleCheckIn}
                  onClick={handleClick}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-okrs" className="mt-4">
          {displayObjectives.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayObjectives.map(obj => (
                <OkrObjectiveCard
                  key={obj.id}
                  objective={obj}
                  keyResults={objectiveKeyResultsMap.get(obj.id) || []}
                  onCheckIn={handleCheckIn}
                  onClick={handleClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-bold text-muted-foreground">No objectives found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create objectives to get started.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <OkrCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {selectedObjective && (
        <OkrCheckInDialog
          open={isCheckInOpen}
          onOpenChange={setIsCheckInOpen}
          objectiveId={selectedObjective.id}
          keyResults={selectedKeyResults}
        />
      )}

      <OkrWizardDialog
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        submissions={submissions}
        risks={risks}
        cars={cars}
        units={units}
        cycles={cycles}
        auditPlans={auditPlans}
        csmResponses={csmResponses}
        activities={activities}
        activityLogs={activityLogs}
        evaluations={evaluations}
        okrObjectives={allObjectives}
        okrKeyResults={allKeyResults}
        selectedYear={selectedYear}
      />
    </div>
  );
}
