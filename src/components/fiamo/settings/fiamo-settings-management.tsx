'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, addDoc, deleteDoc, serverTimestamp, collection } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Building2,
  ShieldCheck,
  Info,
  Wrench,
  FileCheck2,
  Plus,
  Trash2,
  Users,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useSessionActivity } from '@/lib/activity-log-provider';
import type { FiamoSettings, FiamoEvidenceType, FiamoWorkerType, User, Campus, Unit } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EVIDENCE_CATEGORIES: { value: FiamoEvidenceType['category']; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'document', label: 'Document' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'receipt', label: 'Receipt / RIS' },
  { value: 'signoff', label: 'Client Sign-off' },
];

export function FiamoSettingsManagement() {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();
  const { logSessionActivity } = useSessionActivity();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(() => (isAdmin ? 'office' : 'evidence'));
  const [selectedCampusId, setSelectedCampusId] = useState('');

  // FIAMO settings
  const fiamoSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'fiamoSettings') : null),
    [firestore],
  );
  const { data: settings, isLoading: isLoadingSettings } = useDoc<FiamoSettings>(fiamoSettingsRef);

  // Evidence types
  const evidenceTypesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'fiamoEvidenceTypes') : null),
    [firestore],
  );
  const { data: evidenceTypes, isLoading: isLoadingEvidence } = useCollection<FiamoEvidenceType>(evidenceTypesQuery);

  // Worker types
  const workerTypesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'fiamoWorkerTypes') : null),
    [firestore],
  );
  const { data: workerTypes, isLoading: isLoadingWorkerTypes } = useCollection<FiamoWorkerType>(workerTypesQuery);

  // Campuses + Units + Users
  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const usersQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'users') : null),
    [firestore, isAdmin],
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  // Form states
  const [officeName, setOfficeName] = useState('Facilities, Infrastructure and Auxiliary Management Office');
  const [enabled, setEnabled] = useState(false);
  const [officeUnitId, setOfficeUnitId] = useState('');
  const [fiamoAdminId, setFiamoAdminId] = useState('');
  const [coordinatorIds, setCoordinatorIds] = useState<string[]>([]);
  const [odimoIds, setOdimoIds] = useState<string[]>([]);
  const [vpafIds, setVpafIds] = useState<string[]>([]);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [personnelCampusId, setPersonnelCampusId] = useState('');
  const [coveredCampuses, setCoveredCampuses] = useState<string[]>([]);
  const [coveredUnits, setCoveredUnits] = useState<string[]>([]);

  // Evidence form
  const [newEvidenceLabel, setNewEvidenceLabel] = useState('');
  const [newEvidenceCategory, setNewEvidenceCategory] = useState<FiamoEvidenceType['category']>('photo');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [newEvidenceRequired, setNewEvidenceRequired] = useState(true);

  // Worker type form
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerDesc, setNewWorkerDesc] = useState('');
  const [newWorkerUnitId, setNewWorkerUnitId] = useState('');
  const [newWorkerEvidenceIds, setNewWorkerEvidenceIds] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
      setOfficeName(settings.officeName || 'Facilities, Infrastructure and Auxiliary Management Office');
      setEnabled(!!settings.enabled);
      setOfficeUnitId(settings.officeUnitId || '');
      setFiamoAdminId(settings.fiamoAdminId || '');
      setCoordinatorIds(settings.coordinatorIds || []);
      setOdimoIds(settings.odimoIds || []);
      setVpafIds(settings.vpafIds || []);
      setStaffIds(settings.staffIds || []);
      setCoveredCampuses(settings.campuses || []);
      setCoveredUnits(settings.units || []);
    }
  }, [settings]);

  const canManageOffice = isAdmin;

  const handleSaveOffice = async () => {
    if (!firestore || !userProfile || !canManageOffice) return;
    setIsSubmitting(true);
    try {
      const nextCampusPersonnel = { ...(settings?.campusPersonnel || {}) };
      if (personnelCampusId) {
        nextCampusPersonnel[personnelCampusId] = {
          coordinatorIds,
          coordinatorNames: (users || [])
            .filter((u) => coordinatorIds.includes(u.id))
            .map((u) => `${u.firstName} ${u.lastName}`),
          odimoIds,
          odimoNames: (users || []).filter((u) => odimoIds.includes(u.id)).map((u) => `${u.firstName} ${u.lastName}`),
          staffIds,
        };
      }

      await setDoc(
        doc(firestore, 'system', 'fiamoSettings'),
        {
          enabled,
          officeName,
          officeUnitId: officeUnitId || undefined,
          officeUnitName: units?.find((u) => u.id === officeUnitId)?.name || undefined,
          fiamoAdminId: fiamoAdminId || undefined,
          fiamoAdminName: users?.find((u) => u.id === fiamoAdminId)
            ? `${users.find((u) => u.id === fiamoAdminId)?.firstName} ${users.find((u) => u.id === fiamoAdminId)?.lastName}`
            : undefined,
          campusPersonnel: nextCampusPersonnel,
          vpafIds,
          vpafNames: (users || []).filter((u) => vpafIds.includes(u.id)).map((u) => `${u.firstName} ${u.lastName}`),
          campuses: coveredCampuses,
          units: coveredUnits,
          notificationChannels: settings?.notificationChannels || ['in-app'],
          presidentApprovalMode: settings?.presidentApprovalMode || 'pdf_upload',
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.id,
        },
        { merge: true },
      );
      logSessionActivity('FIAMO office settings updated', {
        action: 'fiamo_settings_updated',
        details: { officeName, enabled },
      });
      toast({ title: 'FIAMO Office Updated', description: 'FIAMO configuration has been saved.' });
    } catch (error) {
      console.error('Error saving FIAMO settings:', error);
      toast({ title: 'Save Failed', description: 'Could not save FIAMO settings.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEvidenceType = async () => {
    if (!firestore || !userProfile || !newEvidenceLabel.trim()) return;
    try {
      await addDoc(collection(firestore, 'fiamoEvidenceTypes'), {
        label: newEvidenceLabel.trim(),
        description: newEvidenceDesc.trim(),
        category: newEvidenceCategory,
        isRequired: newEvidenceRequired,
        sortOrder: (evidenceTypes?.length || 0) + 1,
        campusId: userProfile.campusId,
        unitId: userProfile.unitId,
        createdBy: userProfile.id,
        createdByName: `${userProfile.firstName} ${userProfile.lastName}`,
        createdAt: serverTimestamp(),
      });
      setNewEvidenceLabel('');
      setNewEvidenceDesc('');
      setNewEvidenceRequired(true);
      logSessionActivity('FIAMO evidence type added', {
        action: 'evidence_type_created',
        details: { label: newEvidenceLabel.trim() },
      });
      toast({ title: 'Evidence Type Added' });
    } catch (error) {
      console.error('Error adding evidence type:', error);
      toast({ title: 'Add Failed', variant: 'destructive' });
    }
  };

  const handleDeleteEvidenceType = async (id: string, label: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'fiamoEvidenceTypes', id));
      logSessionActivity('FIAMO evidence type deleted', {
        action: 'evidence_type_updated',
        details: { label },
      });
      toast({ title: 'Evidence Type Deleted' });
    } catch (error) {
      console.error('Error deleting evidence type:', error);
      toast({ title: 'Delete Failed', variant: 'destructive' });
    }
  };

  const handleAddWorkerType = async () => {
    if (!firestore || !userProfile || !newWorkerName.trim() || !selectedCampusId) return;
    try {
      await addDoc(collection(firestore, 'fiamoWorkerTypes'), {
        name: newWorkerName.trim(),
        description: newWorkerDesc.trim(),
        unitId: newWorkerUnitId,
        unitName: units?.find((u) => u.id === newWorkerUnitId)?.name || '',
        campusId: selectedCampusId,
        requiredEvidenceTypeIds: newWorkerEvidenceIds,
        isActive: true,
        createdBy: userProfile.id,
        createdByName: `${userProfile.firstName} ${userProfile.lastName}`,
        createdAt: serverTimestamp(),
      });
      setNewWorkerName('');
      setNewWorkerDesc('');
      setNewWorkerUnitId('');
      setNewWorkerEvidenceIds([]);
      logSessionActivity('FIAMO worker type added', {
        action: 'worker_type_created',
        details: { name: newWorkerName.trim() },
      });
      toast({ title: 'Worker Type Added' });
    } catch (error) {
      console.error('Error adding worker type:', error);
      toast({ title: 'Add Failed', variant: 'destructive' });
    }
  };

  const handleToggleWorkerType = async (wt: FiamoWorkerType) => {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'fiamoWorkerTypes', wt.id), { isActive: !wt.isActive }, { merge: true });
      toast({ title: wt.isActive ? 'Worker Type Deactivated' : 'Worker Type Activated' });
    } catch (error) {
      console.error('Error toggling worker type:', error);
      toast({ title: 'Update Failed', variant: 'destructive' });
    }
  };

  const handleToggleEvidenceRequired = (id: string) => {
    setNewWorkerEvidenceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredUnits = useMemo(() => {
    if (!units || !selectedCampusId) return [];
    return units.filter((u) => u.campusIds?.includes(selectedCampusId));
  }, [units, selectedCampusId]);

  const mainCampus = useMemo(() => campuses?.find((c) => c.name === 'Main Campus'), [campuses]);

  const mainCampusUnits = useMemo(() => {
    if (!units || !mainCampus) return [];
    return units.filter((u) => u.campusIds?.includes(mainCampus.id));
  }, [units, mainCampus]);

  const officeUsers = useMemo(() => {
    if (!users || !officeUnitId) return [];
    return users.filter((u) => u.unitId === officeUnitId);
  }, [users, officeUnitId]);

  const personnelUsers = useMemo(() => {
    if (!users || !personnelCampusId) return [];
    return users.filter((u) => u.campusId === personnelCampusId);
  }, [users, personnelCampusId]);

  useEffect(() => {
    if (settings?.campusPersonnel && personnelCampusId) {
      const cp = settings.campusPersonnel[personnelCampusId];
      setCoordinatorIds(cp?.coordinatorIds || []);
      setOdimoIds(cp?.odimoIds || []);
      setStaffIds(cp?.staffIds || []);
    }
  }, [personnelCampusId, settings?.campusPersonnel]);

  const vpafOfficeUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const role = u.role?.toLowerCase() || '';
      const unitName = u.unitName?.toLowerCase() || '';
      return role.includes('vice president') || unitName.includes('vice president');
    });
  }, [users]);

  const getEvidenceLabel = (id: string) => evidenceTypes?.find((e) => e.id === id)?.label || id;
  const getUserName = (id: string) =>
    users?.find((u) => u.id === id)?.firstName + ' ' + users?.find((u) => u.id === id)?.lastName || id;

  const isLoading =
    isLoadingSettings ||
    isLoadingEvidence ||
    isLoadingWorkerTypes ||
    isLoadingCampuses ||
    isLoadingUnits ||
    isLoadingUsers;

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 border-b">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              FIAMO Office Administration
            </span>
          </div>
          <CardTitle>FIAMO Monitoring Setup</CardTitle>
          <CardDescription>
            Configure the Facilities, Infrastructure and Auxiliary Management Office, its personnel, covered sites, and
            evidence requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted p-1 w-full md:w-auto">
              {isAdmin && (
                <TabsTrigger
                  value="office"
                  className="text-[10px] font-black uppercase tracking-widest px-6 h-8 gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Office Setup
                </TabsTrigger>
              )}
              <TabsTrigger
                value="evidence"
                className="text-[10px] font-black uppercase tracking-widest px-6 h-8 gap-1.5"
              >
                <FileCheck2 className="h-3.5 w-3.5" /> Evidence Types
              </TabsTrigger>
              <TabsTrigger
                value="workers"
                className="text-[10px] font-black uppercase tracking-widest px-6 h-8 gap-1.5"
              >
                <Wrench className="h-3.5 w-3.5" /> Worker Types
              </TabsTrigger>
            </TabsList>

            {/* OFFICE SETUP TAB */}
            {isAdmin && (
              <TabsContent value="office" className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/10">
                  <div>
                    <p className="font-bold text-sm">Enable FIAMO Monitoring</p>
                    <p className="text-xs text-muted-foreground">Turns on the FIAMO module for the whole university.</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Office Name</label>
                  <Input
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    placeholder="Facilities, Infrastructure and Auxiliary Management Office"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      FIAMO Office (Unit in Main Campus)
                    </label>
                    <Select
                      value={officeUnitId}
                      onValueChange={(val) => {
                        setOfficeUnitId(val);
                        setFiamoAdminId('');
                        setCoordinatorIds([]);
                        setOdimoIds([]);
                        setStaffIds([]);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Select the FIAMO office..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mainCampusUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                        {mainCampusUnits.length === 0 && (
                          <SelectItem value="__none" disabled>
                            No units found on Main Campus
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Personnel assignment lists below are limited to staff of this office.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      FIAMO Admin
                    </label>
                    <Select value={fiamoAdminId} onValueChange={setFiamoAdminId} disabled={!officeUnitId}>
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder={officeUnitId ? 'Select FIAMO admin...' : 'Select the office first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {officeUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.role})
                          </SelectItem>
                        ))}
                        {officeUsers.length === 0 && (
                          <SelectItem value="__none" disabled>
                            No users in the selected office
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      The FIAMO admin manages this office aside from the system administrator.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Users className="h-4 w-4" /> Personnel Assignments
                    </p>
                  </div>

                  <div className="space-y-2 p-4 rounded-lg border bg-muted/10">
                    <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      Campus (for personnel assignment)
                    </label>
                    <Select value={personnelCampusId} onValueChange={setPersonnelCampusId}>
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Select a covered campus to assign its personnel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(coveredCampuses.length > 0 ? coveredCampuses : campuses?.map((c) => c.id) || []).map((id) => (
                          <SelectItem key={id} value={id}>
                            {campuses?.find((c) => c.id === id)?.name || id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Assign coordinators, ODIMOs, and staff for each covered campus. VPAF is university-wide.
                    </p>
                  </div>

                  {/* Unit Coordinators (Approvers) */}
                  <div className="space-y-2 p-4 rounded-lg border border-green-200 bg-green-50/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">
                          Unit Coordinator(s) — <span className="text-green-700">Can Approve & Assign</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Review, assign staff, and approve completion of repair requests for this campus.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {coordinatorIds.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {getUserName(id)}
                          <button
                            onClick={() => setCoordinatorIds((prev) => prev.filter((x) => x !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && !coordinatorIds.includes(val)) setCoordinatorIds((prev) => [...prev, val]);
                      }}
                      disabled={!personnelCampusId}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue
                          placeholder={personnelCampusId ? 'Add Unit Coordinator...' : 'Select a campus first'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {personnelUsers
                          .filter((u) => u.role?.toLowerCase().includes('coordinator'))
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id} disabled={coordinatorIds.includes(u.id)}>
                              {u.firstName} {u.lastName} ({u.role})
                            </SelectItem>
                          ))}
                        {personnelUsers.filter((u) => u.role?.toLowerCase().includes('coordinator')).length === 0 && (
                          <SelectItem value="__none" disabled>
                            No coordinators on this campus
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Unit ODIMOs (Overseers) */}
                  <div className="space-y-2 p-4 rounded-lg border border-blue-200 bg-blue-50/40">
                    <div>
                      <p className="text-sm font-bold">
                        Unit ODIMO(s) — <span className="text-blue-700">Read-only Oversight</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Can view all requests and performance but cannot approve or assign. Assigned per campus.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {odimoIds.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {getUserName(id)}
                          <button
                            onClick={() => setOdimoIds((prev) => prev.filter((x) => x !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && !odimoIds.includes(val)) setOdimoIds((prev) => [...prev, val]);
                      }}
                      disabled={!personnelCampusId}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder={personnelCampusId ? 'Add Unit ODIMO...' : 'Select a campus first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {personnelUsers
                          .filter((u) => u.role?.toLowerCase().includes('odimo'))
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id} disabled={odimoIds.includes(u.id)}>
                              {u.firstName} {u.lastName} ({u.role})
                            </SelectItem>
                          ))}
                        {personnelUsers.filter((u) => u.role?.toLowerCase().includes('odimo')).length === 0 && (
                          <SelectItem value="__none" disabled>
                            No ODIMOs on this campus
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* VPAF */}
                  <div className="space-y-2 p-4 rounded-lg border border-purple-200 bg-purple-50/40">
                    <div>
                      <p className="text-sm font-bold">
                        VPAF — <span className="text-purple-700">Budget & Dashboard View</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Vice President for Admin & Finance - read-only financial view. Selected from the Vice President
                        offices.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vpafIds.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {getUserName(id)}
                          <button
                            onClick={() => setVpafIds((prev) => prev.filter((x) => x !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && !vpafIds.includes(val)) setVpafIds((prev) => [...prev, val]);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Add VPAF..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vpafOfficeUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id} disabled={vpafIds.includes(u.id)}>
                            {u.firstName} {u.lastName} ({u.unitName || u.role})
                          </SelectItem>
                        ))}
                        {vpafOfficeUsers.length === 0 && (
                          <SelectItem value="__none" disabled>
                            No Vice President office personnel found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Staff */}
                  <div className="space-y-2 p-4 rounded-lg border border-amber-200 bg-amber-50/40">
                    <div>
                      <p className="text-sm font-bold">
                        FIAMO Staff — <span className="text-amber-700">Execute Tasks</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Assigned repairs & maintenance tasks, provide evidence. Assigned per campus.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {staffIds.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {getUserName(id)}
                          <button
                            onClick={() => setStaffIds((prev) => prev.filter((x) => x !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && !staffIds.includes(val)) setStaffIds((prev) => [...prev, val]);
                      }}
                      disabled={!personnelCampusId}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder={personnelCampusId ? 'Add FIAMO Staff...' : 'Select a campus first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {personnelUsers
                          .filter((u) => !coordinatorIds.includes(u.id) && !odimoIds.includes(u.id))
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id} disabled={staffIds.includes(u.id)}>
                              {u.firstName} {u.lastName} ({u.role})
                            </SelectItem>
                          ))}
                        {personnelUsers.filter((u) => !coordinatorIds.includes(u.id) && !odimoIds.includes(u.id))
                          .length === 0 && (
                          <SelectItem value="__none" disabled>
                            No remaining staff on this campus
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Covered Campuses */}
                <div className="space-y-3">
                  <p className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Covered Sites & Units
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Campuses</label>
                    <div className="flex flex-wrap gap-2">
                      {coveredCampuses.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {campuses?.find((c) => c.id === id)?.name || id}
                          <button
                            onClick={() => setCoveredCampuses((prev) => prev.filter((x) => x !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && !coveredCampuses.includes(val)) setCoveredCampuses((prev) => [...prev, val]);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Add Campus..." />
                      </SelectTrigger>
                      <SelectContent>
                        {campuses?.map((c) => (
                          <SelectItem key={c.id} value={c.id} disabled={coveredCampuses.includes(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      Units / Offices
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {coveredUnits.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {units?.find((u) => u.id === id)?.name || id}
                          <button
                            onClick={() => setCoveredUnits((prev) => prev.filter((x) => x !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && !coveredUnits.includes(val)) setCoveredUnits((prev) => [...prev, val]);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Add Unit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {units?.map((u) => (
                          <SelectItem key={u.id} value={u.id} disabled={coveredUnits.includes(u.id)}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-blue-800">Personnel Authority Note</p>
                    <p className="text-[10px] text-blue-700 leading-relaxed italic">
                      Only Unit Coordinators can approve and assign. Unit ODIMOs can oversee but cannot perform approval
                      actions. VPAF has read-only financial oversight.
                    </p>
                  </div>
                </div>

                <CardFooter className="bg-muted/10 border-t py-4 px-0">
                  <Button
                    onClick={handleSaveOffice}
                    disabled={isSubmitting}
                    className="shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Save FIAMO Office Setup
                  </Button>
                </CardFooter>
              </TabsContent>
            )}

            {/* EVIDENCE TYPES TAB */}
            <TabsContent value="evidence" className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-lg bg-muted/20 border">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Evidence Label</label>
                    <Input
                      value={newEvidenceLabel}
                      onChange={(e) => setNewEvidenceLabel(e.target.value)}
                      placeholder="e.g. Photo - Before & After Repair"
                    />
                  </div>
                  <div className="w-full md:w-44 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Category</label>
                    <Select
                      value={newEvidenceCategory}
                      onValueChange={(v) => setNewEvidenceCategory(v as FiamoEvidenceType['category'])}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVIDENCE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-64 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Description (optional)
                    </label>
                    <Input
                      value={newEvidenceDesc}
                      onChange={(e) => setNewEvidenceDesc(e.target.value)}
                      placeholder="Short description"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Required</label>
                    <Switch checked={newEvidenceRequired} onCheckedChange={setNewEvidenceRequired} />
                  </div>
                  <Button
                    onClick={handleAddEvidenceType}
                    size="sm"
                    disabled={!newEvidenceLabel.trim()}
                    className="font-bold text-[10px] uppercase tracking-widest"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Evidence Type
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                {evidenceTypes?.map((et) => (
                  <div
                    key={et.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-900 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary h-9 w-9 rounded-lg flex items-center justify-center">
                        <FileCheck2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{et.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="mr-1 text-[9px] uppercase">
                            {et.category}
                          </Badge>
                          {et.isRequired && (
                            <Badge className="mr-1 text-[9px]" variant="default">
                              Required
                            </Badge>
                          )}
                          {et.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEvidenceType(et.id, et.label)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!evidenceTypes || evidenceTypes.length === 0) && (
                  <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground text-sm">
                    No evidence types configured yet. Add your first one above.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* WORKER TYPES TAB */}
            <TabsContent value="workers" className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-lg bg-muted/20 border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Worker Type Name</label>
                    <Input
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                      placeholder="e.g. Electrician, Plumber, Mason..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Campus</label>
                    <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Select Campus" />
                      </SelectTrigger>
                      <SelectContent>
                        {campuses?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Unit / Sub-office</label>
                    <Select value={newWorkerUnitId} onValueChange={setNewWorkerUnitId} disabled={!selectedCampusId}>
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder={selectedCampusId ? 'Select Unit' : 'Pick Campus first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Description</label>
                  <Textarea
                    value={newWorkerDesc}
                    onChange={(e) => setNewWorkerDesc(e.target.value)}
                    placeholder="What does this worker type do?"
                    rows={2}
                  />
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Required Evidence Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {evidenceTypes?.map((et) => (
                      <Badge
                        key={et.id}
                        variant={newWorkerEvidenceIds.includes(et.id) ? 'default' : 'outline'}
                        className="cursor-pointer gap-1 px-3 py-1.5"
                        onClick={() => handleToggleEvidenceRequired(et.id)}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {et.label}
                      </Badge>
                    ))}
                    {(!evidenceTypes || evidenceTypes.length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        Add evidence types first in the Evidence Types tab.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleAddWorkerType}
                    size="sm"
                    disabled={!newWorkerName.trim() || !selectedCampusId}
                    className="font-bold text-[10px] uppercase tracking-widest"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Worker Type
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                {workerTypes?.map((wt) => (
                  <div
                    key={wt.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-900 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary h-9 w-9 rounded-lg flex items-center justify-center">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{wt.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {wt.unitName || 'No unit'} ·{' '}
                          {campuses?.find((c) => c.id === wt.campusId)?.name || 'No campus'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {wt.requiredEvidenceTypeIds?.map((eid) => (
                            <Badge key={eid} variant="secondary" className="text-[9px]">
                              {getEvidenceLabel(eid)}
                            </Badge>
                          ))}
                          {(!wt.requiredEvidenceTypeIds || wt.requiredEvidenceTypeIds.length === 0) && (
                            <Badge variant="outline" className="text-[9px]">
                              No evidence required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleWorkerType(wt)}
                      className={wt.isActive ? 'text-muted-foreground' : 'text-green-600'}
                    >
                      {wt.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                ))}
                {(!workerTypes || workerTypes.length === 0) && (
                  <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground text-sm">
                    No worker types configured yet. Create your first one above.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
