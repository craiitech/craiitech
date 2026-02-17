
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Loader2, CalendarSearch, BarChart3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Risk, User as AppUser, Unit, Campus, Cycle } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { RiskFormDialog } from '@/components/risk/risk-form-dialog';
import { RiskTable } from '@/components/risk/risk-table';
import { RiskDashboard } from '@/components/risk/risk-dashboard';
import { useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export default function RiskRegisterPage() {
    const { userProfile, isAdmin, userRole, isUserLoading, firestore, isSupervisor } = useUser();
    const searchParams = useSearchParams();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
    const [isMandatory, setIsMandatory] = useState(false);
    const [registryLink, setRegistryLink] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        if (searchParams.get('openForm') === 'true') {
            setIsMandatory(searchParams.get('mandatory') === 'true');
            setRegistryLink(searchParams.get('link'));
            handleNewRisk();
        }
    }, [searchParams]);
    
    const risksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        
        if (isAdmin) {
            return query(
                collection(firestore, 'risks'), 
                where('year', '==', selectedYear)
            );
        }
        if (isSupervisor) {
            if (userProfile.campusId) {
                return query(
                    collection(firestore, 'risks'), 
                    where('year', '==', selectedYear),
                    where('campusId', '==', userProfile.campusId)
                );
            }
            return null; 
        }
        if (userProfile.unitId) {
            return query(
                collection(firestore, 'risks'), 
                where('year', '==', selectedYear),
                where('unitId', '==', userProfile.unitId)
            );
        }
        return null; 
    }, [firestore, userProfile, isSupervisor, isAdmin, selectedYear]);

    const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);
    
    const campusDataQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
    const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusDataQuery);
    
    const campusMap = useMemo(() => {
        if (!allCampuses) return new Map<string, string>();
        return new Map(allCampuses.map(c => [c.id, c.name]));
    }, [allCampuses]);

    const unitsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'units');
    }, [firestore]);
    const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

    const unitMap = useMemo(() => {
        if (!allUnits) return new Map<string, string>();
        return new Map(allUnits.map(u => [u.id, u.name]));
    }, [allUnits]);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        if (isAdmin || isSupervisor) {
            return collection(firestore, 'users');
        }
        if (userProfile.unitId) {
            return query(collection(firestore, 'users'), where('unitId', '==', userProfile.unitId));
        }
        return null;
    }, [firestore, isAdmin, isSupervisor, userProfile]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);
    
    const handleNewRisk = () => {
        setEditingRisk(null);
        setIsFormOpen(true);
    };

    const handleEditRisk = (risk: Risk) => {
        setIsMandatory(false);
        setEditingRisk(risk);
        setIsFormOpen(true);
    };
    
    const isLoading = isUserLoading || isLoadingRisks || isLoadingUsers || isLoadingUnits || isLoadingCampuses;

    const canLogRisk = isAdmin || !isSupervisor;

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Risk & Opportunity Register</h2>
            <p className="text-muted-foreground">
              A centralized module for logging, tracking, and monitoring risks and opportunities for your unit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block text-right">Monitoring Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[120px] h-9">
                        <CalendarSearch className="h-4 w-4 mr-2 opacity-50" />
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {canLogRisk && (
                <div className="pt-5">
                    <Button onClick={handleNewRisk} className="h-9 shadow-lg shadow-primary/20">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Log New Entry
                    </Button>
                </div>
            )}
          </div>
      </div>

      <Tabs defaultValue="visual-insights" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 border">
            <TabsTrigger value="visual-insights" className="gap-2 data-[state=active]:shadow-sm">
                <BarChart3 className="h-4 w-4" /> Visual Insights
            </TabsTrigger>
            <TabsTrigger value="detailed-register" className="gap-2 data-[state=active]:shadow-sm">
                <List className="h-4 w-4" /> Detailed Register
            </TabsTrigger>
        </TabsList>

        <TabsContent value="visual-insights">
            <RiskDashboard 
                risks={risks || []} 
                isLoading={isLoading} 
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="detailed-register">
            <Card>
                <CardHeader>
                    <CardTitle>Register for {selectedYear}</CardTitle>
                    <CardDescription>
                        Below is a list of all risks and opportunities for {isSupervisor && !isAdmin && userProfile?.campusId ? `the ${campusMap.get(userProfile.campusId) || 'campus'}` : (isAdmin ? 'all units' : 'your unit')} in {selectedYear}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <RiskTable 
                            risks={risks ?? []}
                            usersMap={usersMap}
                            onEdit={handleEditRisk}
                            isAdmin={isAdmin}
                            isSupervisor={isSupervisor}
                            campusMap={campusMap}
                            unitMap={unitMap}
                        />
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
    <RiskFormDialog 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        risk={editingRisk}
        unitUsers={users || []}
        allUnits={allUnits || []}
        allCampuses={allCampuses || []}
        isMandatory={isMandatory}
        registryLink={registryLink}
        defaultYear={selectedYear}
    />
    </>
  );
}
