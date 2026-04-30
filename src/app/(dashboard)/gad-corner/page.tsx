'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Campus, Unit, ProgramComplianceRecord, GADInitiative, GadSettings, GADPlan, GADActivity } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, 
    HandHeart, 
    Users, 
    BarChart3, 
    ListChecks, 
    Target, 
    Building, 
    FileText, 
    Settings2, 
    Smartphone, 
    Globe, 
    Zap,
    Printer,
    CheckCircle2,
    CalendarCheck
} from 'lucide-react';
import { SDDHub } from '@/components/gad/sdd-hub';
import { GADOverview } from '@/components/gad/gad-overview';
import { GADInitiatives } from '@/components/gad/gad-initiatives';
import { GADMainstreaming } from '@/components/gad/gad-mainstreaming';
import { GADPlansTab } from '@/components/gad/gad-plans-tab';
import { GADAccomplishmentTab } from '@/components/gad/gad-accomplishment-tab';
import { GADActivitiesTab } from '@/components/gad/gad-activities-tab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function GadCornerPage() {
  const { userProfile, isAdmin, isUserLoading, userRole, isSupervisor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');

  const gadSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'gadSettings') : null),
    [firestore]
  );
  const { data: gadSettings, isLoading: isLoadingSettings } = useDoc<GadSettings>(gadSettingsRef);

  const isInstitutionalViewer = useMemo(() => {
    if (isAdmin) return true;
    if (gadSettings?.leadershipUnitId && userProfile?.unitId === gadSettings.leadershipUnitId) return true;
    return false;
  }, [isAdmin, gadSettings, userProfile]);

  useEffect(() => {
    if (userProfile && !isUserLoading) {
        if (isInstitutionalViewer) {
            setSelectedUnitId('all');
        } else if (userProfile.unitId) {
            setSelectedUnitId(userProfile.unitId);
        }
    }
  }, [userProfile, isUserLoading, isInstitutionalViewer]);

  // Data Queries
  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !userProfile) return null;
    const baseRef = collection(firestore, 'programCompliances');
    if (selectedUnitId === 'all') {
        return query(baseRef, where('academicYear', '==', selectedYear));
    }
    return query(baseRef, where('academicYear', '==', selectedYear), where('unitId', '==', selectedUnitId));
  }, [firestore, isUserLoading, selectedYear, selectedUnitId, userProfile]);
  
  const { data: compliances, isLoading: isLoadingCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const initiativesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !userProfile) return null;
    const baseRef = collection(firestore, 'gadInitiatives');
    if (selectedUnitId === 'all') {
        return query(baseRef, where('year', '==', selectedYear));
    }
    return query(baseRef, where('year', '==', selectedYear), where('unitId', '==', selectedUnitId));
  }, [firestore, isUserLoading, selectedYear, selectedUnitId, userProfile]);
  
  const { data: initiatives } = useCollection<GADInitiative>(initiativesQuery);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'gadPlans');
    if (selectedUnitId === 'all') return query(baseRef, where('year', '==', selectedYear));
    return query(baseRef, where('year', '==', selectedYear), where('unitId', '==', selectedUnitId));
  }, [firestore, selectedYear, selectedUnitId, userProfile]);
  const { data: gadPlans } = useCollection<GADPlan>(plansQuery);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'gadActivities');
    if (selectedUnitId === 'all') return query(baseRef, where('year', '==', selectedYear));
    return query(baseRef, where('year', '==', selectedYear), where('implementingUnitId', '==', selectedUnitId));
  }, [firestore, selectedYear, selectedUnitId, userProfile]);
  const { data: gadActivities } = useCollection<GADActivity>(activitiesQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const filteredUnitsList = useMemo(() => {
    if (!units) return [];
    if (isInstitutionalViewer) return units;
    if (isSupervisor) return units.filter(u => u.campusIds?.includes(userProfile?.campusId || ''));
    return units.filter(u => u.id === userProfile?.unitId);
  }, [units, isInstitutionalViewer, isSupervisor, userProfile]);

  const isLoading = isUserLoading || isLoadingCompliances || isLoadingSettings;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HandHeart className="h-8 w-8 text-primary" />
            GAD Corner
          </h2>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">Gender and Development Hub &bull;</p>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase text-[10px] max-w-[200px] truncate">
                {selectedUnitId === 'all' ? 'Institutional Overview' : units?.find(u => u.id === selectedUnitId)?.name}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            {(isInstitutionalViewer || isSupervisor) && (
                <div className="flex flex-col items-start md:items-end w-full sm:w-auto">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 block">Context Filter</label>
                    <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                        <SelectTrigger className="w-full sm:w-[220px] h-9 font-bold bg-white shadow-sm">
                            <Building className="h-3 w-3 mr-2 opacity-40" />
                            <SelectValue placeholder="Select Unit" />
                        </SelectTrigger>
                        <SelectContent>
                            {(isInstitutionalViewer || isSupervisor) && (
                                <SelectItem value="all" className="font-black text-primary italic">
                                    {isInstitutionalViewer ? 'All Units (Institutional)' : 'All Units (Site Overview)'}
                                </SelectItem>
                            )}
                            {filteredUnitsList.sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="flex flex-col items-start md:items-end w-full sm:w-auto">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 block">Fiscal Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-full sm:w-[120px] h-9 font-bold bg-white shadow-sm">
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
        <div className="sticky top-[4rem] z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b space-y-6">
            <ScrollArea className="w-full">
                <TabsList className="bg-muted p-1 border shadow-sm flex lg:inline-flex animate-tab-highlight rounded-md whitespace-nowrap min-w-max">
                    <TabsTrigger value="overview" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><BarChart3 className="h-4 w-4" /> Strategic Overview</TabsTrigger>
                    <TabsTrigger value="activities" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><CalendarCheck className="h-4 w-4" /> Event Registry</TabsTrigger>
                    <TabsTrigger value="gpb" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Target className="h-4 w-4" /> GAD Plan & Budget (GPB)</TabsTrigger>
                    <TabsTrigger value="ar" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><FileText className="h-4 w-4" /> Accomplishment Report (AR)</TabsTrigger>
                    <TabsTrigger value="sdd" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Users className="h-4 w-4" /> SDD Hub</TabsTrigger>
                    <TabsTrigger value="initiatives" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Target className="h-4 w-4" /> Projects Registry</TabsTrigger>
                    <TabsTrigger value="mainstreaming" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><ListChecks className="h-4 w-4" /> Mainstreaming</TabsTrigger>
                    {isAdmin && <TabsTrigger value="settings" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Settings2 className="h-4 w-4" /> GAD Settings</TabsTrigger>}
                </TabsList>
            </ScrollArea>
        </div>

        <TabsContent value="overview" className="animate-in fade-in duration-500">
          <GADOverview 
            initiatives={initiatives || []} 
            compliances={compliances || []}
            selectedYear={selectedYear}
            unitName={selectedUnitId === 'all' ? 'Institutional' : units?.find(u => u.id === selectedUnitId)?.name}
          />
        </TabsContent>

        <TabsContent value="activities">
            <GADActivitiesTab 
                activities={gadActivities || []}
                campuses={campuses || []}
                units={units || []}
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="gpb">
            <GADPlansTab 
                plans={gadPlans || []}
                campuses={campuses || []}
                units={units || []}
                selectedYear={selectedYear}
                selectedUnitId={selectedUnitId}
            />
        </TabsContent>

        <TabsContent value="ar">
            <GADAccomplishmentTab 
                plans={gadPlans || []}
                activities={gadActivities || []}
                campuses={campuses || []}
                units={units || []}
                selectedYear={selectedYear}
                selectedUnitId={selectedUnitId}
            />
        </TabsContent>

        <TabsContent value="sdd">
          <SDDHub 
            compliances={compliances || []} 
            campuses={campuses || []} 
            units={units || []}
            activities={gadActivities || []}
            selectedYear={selectedYear}
            unitName={selectedUnitId === 'all' ? 'Institutional' : units?.find(u => u.id === selectedUnitId)?.name}
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
            units={selectedUnitId === 'all' ? filteredUnitsList : (units?.filter(u => u.id === selectedUnitId) || [])}
            selectedYear={selectedYear}
          />
        </TabsContent>

        {isAdmin && (
            <TabsContent value="settings">
                <Card className="max-w-2xl border-primary/20 shadow-md">
                    <CardHeader className="bg-primary/5 border-b">
                        <div className="flex items-center gap-2 mb-1">
                            <Settings2 className="h-5 w-5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Registry Controls</span>
                        </div>
                        <CardTitle>GAD System Configuration</CardTitle>
                        <CardDescription>Manage global settings for the GAD reporting ecosystem.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="p-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 space-y-4">
                            <div className="flex items-center gap-3">
                                <Zap className="h-6 w-6 text-primary" />
                                <h4 className="text-xs font-black uppercase text-indigo-900 tracking-tight">Institutional GAD Budget Floor</h4>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-slate-600">Total University Appropriations (Annual)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="number" 
                                        placeholder="e.g., 500000000" 
                                        className="h-11 font-mono font-black"
                                        defaultValue={gadSettings?.institutionalTotalBudget || 0}
                                        onBlur={(e) => setDoc(gadSettingsRef!, { institutionalTotalBudget: Number(e.target.value) }, { merge: true })}
                                    />
                                    <Button disabled variant="outline" className="h-11 px-6 font-black uppercase text-[10px] border-none bg-white">
                                        5% Min: ₱{((gadSettings?.institutionalTotalBudget || 0) * 0.05).toLocaleString()}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic mt-2">Required for validating unit budget compliance in GPB reporting.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
