'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Info, School, Building, Trash2, Plus, Mail } from 'lucide-react';
import type { CommunicationSettings, Unit, Campus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export function CommunicationSettingsManagement() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  const commSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'communicationSettings') : null),
    [firestore],
  );
  const { data: currentSettings, isLoading: isLoadingSettings } = useDoc<CommunicationSettings>(commSettingsRef);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusMap = useMemo(() => {
    if (!campuses) return new Map<string, string>();
    return new Map(campuses.map((c) => [c.id, c.name]));
  }, [campuses]);

  const unitMap = useMemo(() => {
    if (!units) return new Map<string, Unit>();
    return new Map(units.map((u) => [u.id, u]));
  }, [units]);

  const filteredUnits = useMemo(() => {
    if (!units || !selectedCampusId) return [];
    return units.filter((u) => u.campusIds?.includes(selectedCampusId)).sort((a, b) => a.name.localeCompare(b.name));
  }, [units, selectedCampusId]);

  const authorizedUnitsList = useMemo(() => {
    const list = currentSettings?.authorizedUnitIds || [];
    return list
      .map((id) => unitMap.get(id))
      .filter((u): u is Unit => !!u)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentSettings?.authorizedUnitIds, unitMap]);

  const getCampusNamesString = (campusIds: string[] | undefined) => {
    if (!campusIds || campusIds.length === 0) return 'Unassigned';
    return campusIds.map((id) => campusMap.get(id) || 'Unknown').join(', ');
  };

  const handleAddUnit = async () => {
    if (!firestore || !userProfile || !selectedUnitId) return;

    const currentList = currentSettings?.authorizedUnitIds || [];
    if (currentList.includes(selectedUnitId)) {
      toast({
        title: 'Already Added',
        description: 'This unit already has authority to send University-Wide communications.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedList = [...currentList, selectedUnitId];
      await setDoc(
        commSettingsRef!,
        {
          authorizedUnitIds: updatedList,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.id,
        },
        { merge: true },
      );

      toast({
        title: 'Authority Granted',
        description: 'Unit has been successfully authorized to send University-Wide communications.',
      });
      setSelectedUnitId('');
    } catch (error) {
      console.error('Error updating Communication settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to authorize unit.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUnit = async (unitId: string) => {
    if (!firestore || !userProfile) return;

    setIsSubmitting(true);
    try {
      const currentList = currentSettings?.authorizedUnitIds || [];
      const updatedList = currentList.filter((id) => id !== unitId);

      await setDoc(
        commSettingsRef!,
        {
          authorizedUnitIds: updatedList,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.id,
        },
        { merge: true },
      );

      toast({
        title: 'Authority Revoked',
        description: 'Unit authorization for University-Wide communications has been removed.',
      });
    } catch (error) {
      console.error('Error removing unit from Communication settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke authorization.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingSettings || isLoadingUnits || isLoadingCampuses;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-indigo-200 dark:border-indigo-900/50 shadow-md">
        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Communication Scope Settings
            </span>
          </div>
          <CardTitle>University-Wide Communication Authorization</CardTitle>
          <CardDescription>
            Grant specific units the authority to send University-Wide (All Officers) digital communications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Step 1: Select Campus
              </label>
              <Select
                value={selectedCampusId}
                onValueChange={(val) => {
                  setSelectedCampusId(val);
                  setSelectedUnitId('');
                }}
              >
                <SelectTrigger className="h-11 font-bold">
                  <School className="h-4 w-4 mr-2 opacity-40" />
                  <SelectValue placeholder="Select Campus" />
                </SelectTrigger>
                <SelectContent>
                  {campuses
                    ?.sort((a, b) => a.name.localeCompare(b.name))
                    .map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Step 2: Select Unit
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={!selectedCampusId}>
                    <SelectTrigger className="h-11 font-bold">
                      <Building className="h-4 w-4 mr-2 opacity-40" />
                      <SelectValue placeholder={selectedCampusId ? 'Select Unit / Office' : 'Select Campus first...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddUnit}
                  disabled={isSubmitting || !selectedUnitId}
                  className="h-11 px-4 font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" /> Authorize
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 flex items-start gap-3 dark:bg-indigo-950/20 dark:border-indigo-900/50">
            <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-indigo-800 dark:text-indigo-300">Permission Scope Note</p>
              <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed italic">
                By default, System Administrators and the University President can send University-Wide communications. Units authorized here will also be able to dispatch digital correspondence to all officers across the university.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-indigo-200 dark:border-indigo-900/50 shadow-md">
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
          <CardTitle className="text-lg">Authorized Units ({authorizedUnitsList.length})</CardTitle>
          <CardDescription>Units permitted to send University-Wide communications.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {authorizedUnitsList.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No units authorized yet. Only System Administrators and the University President can currently send University-Wide communications.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit / Office Name</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead className="w-[100px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authorizedUnitsList.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-bold">{unit.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium bg-slate-50 dark:bg-slate-800">
                        {getCampusNamesString(unit.campusIds)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => handleRemoveUnit(unit.id)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
