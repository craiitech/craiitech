
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Risk, User as AppUser, Unit } from '@/lib/types';
import { useState, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { RiskFormDialog } from '@/components/risk/risk-form-dialog';
import { RiskTable } from '@/components/risk/risk-table';

export default function RiskRegisterPage() {
    const { userProfile, isAdmin, userRole, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<Risk | null>(null);

    const isSupervisor = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');

    const risksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null; // Wait for dependencies

        let q = collection(firestore, 'risks');

        if (isSupervisor) {
            // Supervisors need a campusId to query
            if (userProfile.campusId) {
                return query(q, where('campusId', '==', userProfile.campusId));
            }
            // If supervisor has no campus, they can't query for anything, return null.
            // Admin is a supervisor but does not have a campusId, so they fall through and get all risks.
            if (!isAdmin) return null; 
        } else {
             // Regular users need a unitId to query
            if (userProfile.unitId) {
                return query(q, where('unitId', '==', userProfile.unitId));
            }
            // If user has no unit, they can't query.
            return null;
        }

        // If we reach here, it's an Admin, return the full collection query.
        return q;

    }, [firestore, userProfile, isSupervisor, isAdmin]);

    const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.campusId) return null;
        // Fetch all users in the same campus to populate 'Responsible Person' dropdown
        return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
    }, [firestore, userProfile?.campusId]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

    const unitsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.campusId) return null;
         return query(collection(firestore, 'units'), where('campusIds', 'array-contains', userProfile.campusId));
    }, [firestore, userProfile?.campusId]);
    const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const handleNewRisk = () => {
        setEditingRisk(null);
        setIsFormOpen(true);
    };

    const handleEditRisk = (risk: Risk) => {
        setEditingRisk(risk);
        setIsFormOpen(true);
    };
    
    const isLoading = isUserLoading || isLoadingRisks || isLoadingUsers || isLoadingUnits;

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
          <Button onClick={handleNewRisk}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Log New Entry
          </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
                Below is a list of all risks and opportunities for {isSupervisor ? `the ${userProfile?.campusId ? campusMap.get(userProfile.campusId) || 'campus' : ''}` : 'your unit'}.
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
        unitUsers={users?.filter(u => u.unitId === userProfile?.unitId) ?? []}
    />
    </>
  );
}

// Dummy map to prevent breaking the UI before data loads.
const campusMap = new Map();
