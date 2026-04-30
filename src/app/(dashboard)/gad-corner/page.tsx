'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc } from 'firebase/firestore';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
    CalendarCheck,
    ShieldCheck,
    Filter
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function GadCornerPage() {
  const { userProfile, isAdmin, isUserLoading, isSupervisor } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentTab = searchParams.get('tab') || 'overview';
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const gadSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'gadSettings') : null),
    [firestore]
  );
  const { data: gadSettings } = useDoc<GadSettings>(gadSettingsRef);

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

  if (isUserLoading) {
      return (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing GAD Registry...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        {/* STICKY HEADER AND TABS */}
        <div className="sticky top-[4rem] z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <HandHeart className="h-8 w-8 text-primary" />
                    GAD Corner Dashboard
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

            <ScrollArea className="w-full">
                <TabsList className="bg-muted p-1 border shadow-sm flex lg:inline-flex animate-tab-highlight rounded-md whitespace-nowrap min-w-max">
                    <TabsTrigger value="overview" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><BarChart3 className="h-4 w-4" /> Strategic Overview</TabsTrigger>
                    <TabsTrigger value="activities" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><CalendarCheck className="h-4 w-4" /> Event Registry</TabsTrigger>
                    <TabsTrigger value="gpb" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Target className="h-4 w-4" /> GAD Plan & Budget (GPB)</TabsTrigger>
                    <TabsTrigger value="ar" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><FileText className="h-4 w-4" /> Accomplishment Report (AR)</TabsTrigger>
                    <TabsTrigger value="sdd" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Users className="h-4 w-4" /> SDD Hub</TabsTrigger>
                    <TabsTrigger value="initiatives" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Target className="h-4 w-4" /> Projects Registry</TabsTrigger>
                    <TabsTrigger value="mainstreaming" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><ListChecks className="h-4 w-4" /> Mainstreaming</TabsTrigger>
                </TabsList>
            </ScrollArea>
        </div>

        {isInstitutionalViewer && currentTab === 'overview' && (
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Institutional GAD Registry Settings</p>
                            <p className="text-[9px] text-muted-foreground font-medium italic">Configure the university-wide annual budget baseline.</p>
                        </div>
                    </div>
                    <div className="flex-1 max-w-sm space-y-1">
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
                    </div>
                </CardContent>
            </Card>
        )}

        <TabsContent value="overview" className="animate-in fade-in duration-500">
          <GADOverview 
            initiatives={initiatives || []} 
            compliances={compliances || []}
            selectedYear={selectedYear}
            unitName={selectedUnitId === 'all' ? 'Institutional' : units?.find(u => u.id === selectedUnitId)?.name}
          />
        </TabsContent>

        <TabsContent value="activities" className="animate-in fade-in duration-500">
            <GADActivitiesTab 
                activities={gadActivities || []}
                campuses={campuses || []}
                units={units || []}
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="gpb" className="animate-in fade-in duration-500">
            <GADPlansTab 
                plans={gadPlans || []}
                campuses={campuses || []}
                units={units || []}
                selectedYear={selectedYear}
                selectedUnitId={selectedUnitId}
            />
        </TabsContent>

        <TabsContent value="ar" className="animate-in fade-in duration-500">
            <GADAccomplishmentTab 
                plans={gadPlans || []}
                activities={gadActivities || []}
                campuses={campuses || []}
                units={units || []}
                selectedYear={selectedYear}
                selectedUnitId={selectedUnitId}
            />
        </TabsContent>

        <TabsContent value="sdd" className="animate-in fade-in duration-500">
          <SDDHub 
            compliances={compliances || []} 
            campuses={campuses || []} 
            units={units || []}
            activities={gadActivities || []}
            selectedYear={selectedYear}
            unitName={selectedUnitId === 'all' ? 'Institutional' : units?.find(u => u.id === selectedUnitId)?.name}
          />
        </TabsContent>

        <TabsContent value="initiatives" className="animate-in fade-in duration-500">
          <GADInitiatives 
            initiatives={initiatives || []}
            campuses={campuses || []}
            units={units || []}
            selectedYear={selectedYear}
          />
        </TabsContent>

        <TabsContent value="mainstreaming" className="animate-in fade-in duration-500">
          <GADMainstreaming 
            units={selectedUnitId === 'all' ? filteredUnitsList : (units?.filter(u => u.id === selectedUnitId) || [])}
            selectedYear={selectedYear}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
