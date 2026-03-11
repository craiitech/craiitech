
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Campus, Unit, ProgramComplianceRecord, GADInitiative } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, HandHeart, Users, BarChart3, ListChecks, Target, Building } from 'lucide-react';
import { SDDHub } from '@/components/gad/sdd-hub';
import { GADOverview } from '@/components/gad/gad-overview';
import { GADInitiatives } from '@/components/gad/gad-initiatives';
import { GADMainstreaming } from '@/components/gad/gad-mainstreaming';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function GadCornerPage() {
  const { userProfile, isAdmin, isUserLoading, userRole, isSupervisor } = useUser();
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');

  // Initialize selected unit based on role
  useEffect(() => {
    if (userProfile && !isUserLoading) {
        if (userProfile.unitId) {
            setSelectedUnitId(userProfile.unitId);
        }
    }
  }, [userProfile, isUserLoading]);

  /**
   * SCOPED COMPLIANCES FETCHING
   * Pulls academic data for SDD calculations - strictly scoped to the selected unit
   */
  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !userProfile || selectedUnitId === 'all') return null;
    const baseRef = collection(firestore, 'programCompliances');
    return query(baseRef, where('academicYear', '==', selectedYear), where('unitId', '==', selectedUnitId));
  }, [firestore, isUserLoading, selectedYear, selectedUnitId, userProfile]);
  
  const { data: compliances, isLoading: isLoadingCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  /**
   * SCOPED GAD INITIATIVES FETCHING
   * Strictly scoped to the selected unit
   */
  const initiativesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !userProfile || selectedUnitId === 'all') return null;
    const baseRef = collection(firestore, 'gadInitiatives');
    return query(baseRef, where('year', '==', selectedYear), where('unitId', '==', selectedUnitId));
  }, [firestore, isUserLoading, selectedYear, selectedUnitId, userProfile]);
  
  const { data: initiatives, isLoading: isLoadingInitiatives } = useCollection<GADInitiative>(initiativesQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const filteredUnitsList = useMemo(() => {
    if (!units) return [];
    if (isAdmin) return units;
    if (isSupervisor) return units.filter(u => u.campusIds?.includes(userProfile?.campusId || ''));
    return units.filter(u => u.id === userProfile?.unitId);
  }, [units, isAdmin, isSupervisor, userProfile]);

  const currentUnitName = useMemo(() => {
    if (selectedUnitId === 'all') return 'Select Unit to View Analytics';
    return units?.find(u => u.id === selectedUnitId)?.name || 'Unknown Unit';
  }, [units, selectedUnitId]);

  const isLoading = isUserLoading || isLoadingCompliances || isLoadingInitiatives;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HandHeart className="h-8 w-8 text-primary" />
            GAD Corner
          </h2>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">
                Gender and Development Hub &bull; 
            </p>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase text-[10px]">
                {currentUnitName}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            {(isAdmin || isSupervisor) && (
                <div className="flex flex-col items-end">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 block">Context Filter</label>
                    <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                        <SelectTrigger className="w-[220px] h-9 font-bold bg-white shadow-sm">
                            <Building className="h-3 w-3 mr-2 opacity-40" />
                            <SelectValue placeholder="Select Unit" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredUnitsList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 block">Fiscal Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[120px] h-9 font-bold bg-white shadow-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted p-1 border shadow-sm w-full md:w-auto h-auto grid grid-cols-2 md:inline-flex">
          <TabsTrigger value="overview" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
            <BarChart3 className="h-4 w-4" /> Unit Overview
          </TabsTrigger>
          <TabsTrigger value="sdd" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
            <Users className="h-4 w-4" /> Unit SDD Hub
          </TabsTrigger>
          <TabsTrigger value="initiatives" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
            <Target className="h-4 w-4" /> GAD Initiatives
          </TabsTrigger>
          <TabsTrigger value="mainstreaming" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
            <ListChecks className="h-4 w-4" /> Mainstreaming
          </TabsTrigger>
        </TabsList>

        {selectedUnitId === 'all' ? (
            <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg border-dashed bg-muted/5">
                <Building className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-lg font-bold text-muted-foreground">Select a Unit to Load GAD Data</h3>
                <p className="text-sm text-muted-foreground mt-1">Use the Context Filter at the top right to select a specific office or department.</p>
            </div>
        ) : (
            <>
                <TabsContent value="overview" className="animate-in fade-in duration-500">
                <GADOverview 
                    initiatives={initiatives || []} 
                    compliances={compliances || []}
                    selectedYear={selectedYear}
                    unitName={currentUnitName}
                />
                </TabsContent>

                <TabsContent value="sdd">
                <SDDHub 
                    compliances={compliances || []} 
                    campuses={campuses || []} 
                    units={units || []}
                    selectedYear={selectedYear}
                    unitName={currentUnitName}
                />
                </TabsContent>

                <TabsContent value="initiatives">
                <GADInitiatives 
                    initiatives={initiatives || []}
                    campuses={campuses || []}
                    units={units || []}
                    selectedYear={selectedYear}
                />
                </TabsContent>

                <TabsContent value="mainstreaming">
                <GADMainstreaming 
                    units={units || []}
                    selectedYear={selectedYear}
                />
                </TabsContent>
            </>
        )}
      </Tabs>
    </div>
  );
}
