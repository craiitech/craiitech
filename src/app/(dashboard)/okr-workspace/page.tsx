'use client';

import { useState, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from '@/firebase/firestore-wrapper';
import { Loader2, Plus, Target, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OkrObjectiveCard } from '@/components/okr/okr-objective-card';
import { OkrCheckInDialog } from '@/components/okr/okr-checkin-dialog';
import { OkrCreateDialog } from '@/components/okr/okr-create-dialog';
import { useUserOkrObjectives } from '@/hooks/kpi/use-kpi-data';
import { useYear } from '@/lib/year-provider';
import { Badge } from '@/components/ui/badge';
import type { OkrObjective, OkrKeyResult } from '@/lib/types';

export default function OkrWorkspacePage() {
  const { isAdmin, isSupervisor, userProfile } = useUser();
  const firestore = useFirestore();
  const { selectedYear } = useYear();
  const [activeTab, setActiveTab] = useState('my-okrs');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState('all');

  const canCreate = isAdmin || isSupervisor;

  const objectivesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'okrObjectives'), where('year', '==', selectedYear));
  }, [firestore, selectedYear]);

  const { data: allObjectives, isLoading } = useCollection<OkrObjective>(objectivesQuery);

  const { data: userObjectives } = useUserOkrObjectives(userProfile?.id || '');

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

  const objectiveKeyResultsMap = useMemo(() => {
    const map = new Map<string, OkrKeyResult[]>();
    if (!allObjectives) return map;
    return map;
  }, [allObjectives]);

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

  const displayObjectives = useMemo(() => {
    const source = activeTab === 'my-okrs' && filteredObjectives.length === 0
      ? (userObjectives || [])
      : filteredObjectives;
    return [...source].sort((a, b) => (b.year || 0) - (a.year || 0));
  }, [filteredObjectives, userObjectives, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">OKR Workspace</h2>
          <p className="text-muted-foreground">
            Objectives and Key Results — set, track, and achieve your goals.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsCreateOpen(true)} className="h-9 text-xs font-bold">
            <Plus className="h-4 w-4 mr-1.5" /> New OKR
          </Button>
        )}
      </div>

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-okrs"><Target className="h-3.5 w-3.5 mr-1.5" /> My OKRs</TabsTrigger>
          <TabsTrigger value="all-okrs">All Objectives</TabsTrigger>
        </TabsList>

        <TabsContent value="my-okrs" className="mt-4">
          {displayObjectives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
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
                  keyResults={[]}
                  onCheckIn={handleCheckIn}
                  onClick={handleClick}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-okrs" className="mt-4">
          {allObjectives && allObjectives.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allObjectives.map(obj => (
                <OkrObjectiveCard
                  key={obj.id}
                  objective={obj}
                  keyResults={[]}
                  onCheckIn={handleCheckIn}
                  onClick={handleClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
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
    </div>
  );
}
