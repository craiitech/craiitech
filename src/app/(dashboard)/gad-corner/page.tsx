
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Campus, Unit, ProgramComplianceRecord, GADInitiative } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, HandHeart, Users, BarChart3, ListChecks, Target } from 'lucide-react';
import { SDDHub } from '@/components/gad/sdd-hub';
import { GADOverview } from '@/components/gad/gad-overview';
import { GADInitiatives } from '@/components/gad/gad-initiatives';
import { GADMainstreaming } from '@/components/gad/gad-mainstreaming';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function GadCornerPage() {
  const { userProfile, isAdmin, isUserLoading, userRole } = useUser();
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'programCompliances'), where('academicYear', '==', selectedYear));
  }, [firestore, isUserLoading, selectedYear]);
  const { data: compliances, isLoading: isLoadingCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  /**
   * GAD INITIATIVES FETCHING
   * Temporarily disabled as per user request to hold off on listing initiatives.
   */
  const initiativesQuery = useMemoFirebase(() => {
    return null; // Query disabled temporarily
  }, [firestore, isUserLoading, userProfile, userRole, isAdmin, selectedYear]);
  
  const { data: initiatives, isLoading: isLoadingInitiatives } = useCollection<GADInitiative>(initiativesQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const isLoading = isUserLoading || isLoadingCompliances;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HandHeart className="h-8 w-8 text-primary" />
            GAD Corner
          </h2>
          <p className="text-muted-foreground">
            Gender and Development initiatives following PCW standards for institutional reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 block">Fiscal Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[140px] h-9 font-bold bg-white shadow-sm">
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
            <BarChart3 className="h-4 w-4" /> Strategic Overview
          </TabsTrigger>
          <TabsTrigger value="sdd" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
            <Users className="h-4 w-4" /> SDD Hub
          </TabsTrigger>
          <TabsTrigger value="initiatives" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
            <Target className="h-4 w-4" /> GAD Initiatives
          </TabsTrigger>
          <TabsTrigger value="mainstreaming" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
            <ListChecks className="h-4 w-4" /> Mainstreaming
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="animate-in fade-in duration-500">
          <GADOverview 
            initiatives={initiatives || []} 
            compliances={compliances || []}
            selectedYear={selectedYear}
          />
        </TabsContent>

        <TabsContent value="sdd">
          <SDDHub 
            compliances={compliances || []} 
            campuses={campuses || []} 
            units={units || []}
            selectedYear={selectedYear}
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
      </Tabs>
    </div>
  );
}
