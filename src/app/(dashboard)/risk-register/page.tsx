
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Risk, User as AppUser, Unit, Campus } from '@/lib/types';
import { useState, useMemo } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { RiskFormDialog } from '@/components/risk/risk-form-dialog';
import { RiskTable } from '@/components/risk/risk-table';

export default function RiskRegisterPage() {
    const { userProfile, isAdmin, userRole, isUserLoading, firestore, isSupervisor } = useUser();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
    
    const risksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;

        const q = collection(firestore, 'risks');
        
        if (isAdmin) {
             return q;
        }

        if (isSupervisor) {
            if (userProfile.campusId) {
                return query(q, where('campusId', '==', userProfile.campusId));
            }
            return null; 
        }

        if (userProfile.unitId) {
            return query(q, where('unitId', '==', userProfile.unitId));
        }
        
        return null; 

    }, [firestore, userProfile, isSupervisor, isAdmin]);

    const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);
    
    const campusDataQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
    const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusDataQuery);
    
    const campusMap = useMemo(() => {
        if (!allCampuses) return new Map();
        return new Map(allCampuses.map(c => [c.id, c.name]));
    }, [allCampuses]);


    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        if (isAdmin) {
            return collection(firestore, 'users');
        }
        if (isSupervisor) {
            if (!userProfile.campusId) return null;
            return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
        }
        // Unit coordinators only need to see users in their own unit for the form
        if (userProfile.unitId) {
            return query(collection(firestore, 'users'), where('unitId', '==', userProfile.unitId));
        }
        return null;
    }, [firestore, isAdmin, isSupervisor, userProfile]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

    const unitsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        if (isAdmin) {
            return collection(firestore, 'units');
        }
        if (userProfile?.campusId) {
             return query(collection(firestore, 'units'), where('campusIds', 'array-contains', userProfile.campusId));
        }
        return null;
    }, [firestore, isAdmin, userProfile?.campusId]);
    const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);
    
    const unitUsers = useMemo(() => {
        if (!users || !userProfile) return [];
        // For Admins, unitUsers could be all users, or filtered differently if needed.
        // For now, let's keep it scoped to the editing user's unit, or all for admin.
        if (isAdmin) return users;
        return users.filter(u => u.unitId === userProfile.unitId);
    }, [users, userProfile, isAdmin]);

    const handleNewRisk = () => {
        setEditingRisk(null);
        setIsFormOpen(true);
    };

    const handleEditRisk = (risk: Risk) => {
        setEditingRisk(risk);
        setIsFormOpen(true);
    };
    
    const isLoading = isUserLoading || isLoadingRisks || isLoadingUsers || isLoadingUnits || isLoadingCampuses;

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Risk & Opportunity Register</h2>
            <p className="text-muted-foreground">
              A centralized module for logging, tracking, and monitoring risks and opportunities for your unit.
            </p>
          </div>
          {!isSupervisor && (
            <Button onClick={handleNewRisk}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Log New Entry
            </Button>
          )}
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
                Below is a list of all risks and opportunities for {isSupervisor && !isAdmin && userProfile?.campusId ? `the ${campusMap.get(userProfile.campusId) || 'campus'}` : (isAdmin ? 'all units' : 'your unit')}.
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
                />
            )}
        </CardContent>
      </Card>
    </div>
    <RiskFormDialog 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        risk={editingRisk}
        unitUsers={unitUsers}
    />
    </>
  );
}

    
