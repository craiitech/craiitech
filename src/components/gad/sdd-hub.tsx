'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { ProgramComplianceRecord, Campus, Unit, UnitPersonnelCensus, GADSector, Employee } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip as RechartsTooltip, 
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LabelList
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { 
    Users, 
    GraduationCap, 
    UserCircle, 
    School, 
    Info, 
    Activity, 
    PieChart as PieIcon, 
    ShieldCheck, 
    CalendarRange, 
    Briefcase, 
    PlusCircle, 
    Save, 
    Loader2, 
    Target, 
    Smartphone,
    LayoutList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { UnitSddExplorer } from './unit-sdd-explorer';

interface SDDHubProps {
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  activities: any[];
  selectedYear: number;
  unitName?: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const GAD_SECTORS: GADSector[] = ['Solo Parent', 'PWD', 'Senior Citizen', 'Youth/Student', 'Employee', 'LGBTQA++', 'Indigenous People'];

export function SDDHub({ compliances, campuses, units, activities, selectedYear, unitName }: SDDHubProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSavingCensus, setIsSaving] = useState(false);

  // 1. UNIT PERSONNEL CENSUS MODULE
  const censusId = userProfile?.unitId ? `${userProfile.unitId}-${selectedYear}` : 'none';
  const censusRef = useMemoFirebase(() => (firestore && userProfile?.unitId ? doc(firestore, 'unitPersonnelCensus', censusId) : null), [firestore, censusId]);
  const { data: census, isLoading: isLoadingCensus } = useDoc<UnitPersonnelCensus>(censusRef);

  // Fetch active employees for auto-calculation
  const activePersonnelQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId) return null;
    return query(
      collection(firestore, 'unitPersonnel'),
      where('unitId', '==', userProfile.unitId),
      where('isActive', '==', true)
    );
  }, [firestore, userProfile?.unitId]);

  const { data: unitPersonnel, isLoading: isLoadingPersonnel } = useCollection<Employee>(activePersonnelQuery);

  const [censusForm, setCensusForm] = useState<Partial<UnitPersonnelCensus>>({
    teaching: { male: 0, female: 0, sectors: {} },
    nonTeaching: { male: 0, female: 0, sectors: {} }
  });

  const handleAutoCalculateCensus = () => {
    if (!unitPersonnel || unitPersonnel.length === 0) {
      toast({
        title: 'No Personnel Found',
        description: 'Please add active staff members to your Personnel Registry in CSM settings first.',
        variant: 'destructive',
      });
      return;
    }

    // Initialize census structure with GAD_SECTORS
    const updatedForm = {
      teaching: {
        male: 0,
        female: 0,
        sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {} as Record<GADSector, { male: number; female: number }>)
      },
      nonTeaching: {
        male: 0,
        female: 0,
        sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {} as Record<GADSector, { male: number; female: number }>)
      }
    };

    unitPersonnel.forEach((emp) => {
      const isTeaching = emp.type === 'Teaching';
      const targetGroup = isTeaching ? updatedForm.teaching : updatedForm.nonTeaching;

      if (emp.sex === 'Male') {
        targetGroup.male++;
      } else {
        targetGroup.female++;
      }

      // Get sectors and auto-add LGBTQA++ if employee has sex 'LGBTQA+'
      const sectorsList = [...(emp.sectors || [])];
      if (emp.sex === 'LGBTQA+' && !sectorsList.includes('LGBTQA++')) {
        sectorsList.push('LGBTQA++');
      }

      sectorsList.forEach((sector) => {
        if (!targetGroup.sectors[sector]) {
          targetGroup.sectors[sector] = { male: 0, female: 0 };
        }
        if (emp.sex === 'Male') {
          targetGroup.sectors[sector].male++;
        } else {
          targetGroup.sectors[sector].female++;
        }
      });
    });

    setCensusForm((prev) => ({
      ...prev,
      teaching: updatedForm.teaching as any,
      nonTeaching: updatedForm.nonTeaching as any,
    }));

    toast({
      title: 'Sync Complete',
      description: `Successfully synchronized and auto-calculated metrics from ${unitPersonnel.length} active staff records.`,
    });
  };

  useEffect(() => {
    if (census) setCensusForm(census);
    else setCensusForm({
        teaching: { male: 0, female: 0, sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}) },
        nonTeaching: { male: 0, female: 0, sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}) }
    } as any);
  }, [census]);

  const handleSaveCensus = async () => {
    if (!firestore || !userProfile?.unitId) return;
    setIsSaving(true);
    try {
        await setDoc(censusRef!, {
            ...censusForm,
            id: censusId,
            unitId: userProfile.unitId,
            campusId: userProfile.campusId,
            year: selectedYear,
            updatedAt: serverTimestamp(),
            updatedBy: userProfile.id
        }, { merge: true });
        toast({ title: 'Census Updated', description: 'Institutional personnel data synchronized.' });
    } catch (e) {
        toast({ title: 'Error', description: 'Failed to update census data.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  const aggregatedData = useMemo(() => {
    let s1Male = 0, s1Female = 0;
    const studentSectors: Record<string, { male: number, female: number }> = {};
    GAD_SECTORS.forEach(s => studentSectors[s] = { male: 0, female: 0 });

    compliances.forEach(record => {
        const enrollmentRecords = record.enrollmentRecords || [];
        const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
        
        enrollmentRecords.forEach(rec => {
            const term = rec.firstSemester; // Baseline for GAD SDD is 1st Sem
            if (term) {
                levels.forEach(level => {
                    const lData = term[level];
                    s1Male += Number(lData?.male || 0);
                    s1Female += Number(lData?.female || 0);
                    
                    if (lData?.sectors) {
                        Object.entries(lData.sectors).forEach(([sec, counts]: any) => {
                            if (studentSectors[sec]) {
                                studentSectors[sec].male += Number(counts.male || 0);
                                studentSectors[sec].female += Number(counts.female || 0);
                            }
                        });
                    }
                });
            }
        });
    });

    const createPieData = (m: number, f: number, o: number = 0) => [
        { name: 'Male', value: m, fill: COLORS[0] },
        { name: 'Female', value: f, fill: COLORS[1] },
        { name: 'Others', value: o, fill: COLORS[2] }
    ].filter(d => d.value > 0);

    const sectoralChartData = Object.entries(studentSectors).map(([name, counts]) => ({
        name,
        total: counts.male + counts.female,
        male: counts.male,
        female: counts.female
    })).filter(d => d.total > 0).sort((a,b) => b.total - a.total);

    return {
        s1: createPieData(s1Male, s1Female),
        studentSectors: sectoralChartData,
        totals: { s1: s1Male + s1Female }
    };
  }, [compliances]);

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black">{`${(percent * 100).toFixed(0)}%`}</text>;
  };

  return (
    <div className="space-y-8 border-none pb-20">
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="py-4">
            <div className="flex items-center gap-2 text-primary mb-1">
                <Info className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Institutional SDD HUB</span>
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Sex-Disaggregated Data (SDD) Hub: {unitName}</CardTitle>
            <CardDescription className="text-xs">Consolidated analysis of students, personnel, and activity participants for AY {selectedYear}.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* STUDENT SDD SUMMARY */}
          <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col h-full bg-white">
                  <CardHeader className="p-4 bg-primary/5 border-b text-center shrink-0">
                      <div className="mx-auto h-10 w-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm"><Users className="h-5 w-5 text-primary" /></div>
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest leading-tight">Student Population Baseline</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 flex-1 flex flex-col items-center justify-center">
                      {aggregatedData.s1.length > 0 ? (
                        <>
                            <ChartContainer config={{}} className="h-[220px] w-full mb-6">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={aggregatedData.s1} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={renderLabel} labelLine={false}>
                                            {aggregatedData.s1.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                        </Pie>
                                        <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                        <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            <div className="text-center">
                                <p className="text-4xl font-black text-slate-900 tabular-nums leading-none">{aggregatedData.totals.s1.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Enrolled Baseline</p>
                            </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center opacity-20 py-20 space-y-3">
                            <PieIcon className="h-12 w-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No enrollment data for {selectedYear}</p>
                        </div>
                      )}
                  </CardContent>
              </Card>
          </div>

          {/* STUDENT SECTORAL DISTRIBUTION */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-primary/10 h-full flex flex-col">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Student Sectoral Reach Analysis</CardTitle>
                    </div>
                    <CardDescription className="text-[10px]">Headcount of students belonging to marginalized or prioritized GAD groups.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 flex-1">
                    {aggregatedData.studentSectors.length > 0 ? (
                        <ChartContainer config={{}} className="h-[350px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={aggregatedData.studentSectors} layout="vertical" margin={{ left: 20, right: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 900 }} width={120} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<ChartTooltipContent />} />
                                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '10px' }} />
                                    <Bar dataKey="male" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="female" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="total" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-20">
                            <LayoutList className="h-12 w-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest mt-2">Zero Sectoral Hits Recorded</p>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>
      </div>

      {/* UNIT PERSONNEL CENSUS WORKSPACE */}
      {!isLoadingCensus && userProfile?.unitId && (
          <Card className="border-indigo-200 shadow-xl overflow-hidden bg-indigo-50/5">
              <CardHeader className="bg-indigo-50 border-b py-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                          <div className="flex items-center gap-2 text-indigo-700">
                            <Briefcase className="h-5 w-5" />
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Unit Personnel Census Workspace</CardTitle>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600/70">Update total employee headcount for your office for AY {selectedYear}.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                          <Button 
                            variant="outline" 
                            onClick={handleAutoCalculateCensus} 
                            disabled={isLoadingPersonnel || isSavingCensus}
                            className="border-indigo-300 text-indigo-700 hover:bg-indigo-100/50 hover:text-indigo-800 bg-white font-black uppercase text-[10px] tracking-widest h-10 px-5"
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            Sync from Registry
                          </Button>
                          <Button onClick={handleSaveCensus} disabled={isSavingCensus} className="shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest h-10 px-8">
                              {isSavingCensus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                              Commit Personnel Registry
                          </Button>
                      </div>
                  </div>
              </CardHeader>
              <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* TEACHING CENSUS */}
                      <section className="space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-800 border-b pb-1 flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" /> 1. Teaching Faculty (Unit Total)
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-500">Total Male</Label>
                                  <Input type="number" value={censusForm.teaching?.male} onChange={(e) => setCensusForm(prev => ({ ...prev, teaching: { ...prev.teaching!, male: Number(e.target.value) } }))} className="h-10 bg-white font-black" />
                              </div>
                              <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-500">Total Female</Label>
                                  <Input type="number" value={censusForm.teaching?.female} onChange={(e) => setCensusForm(prev => ({ ...prev, teaching: { ...prev.teaching!, female: Number(e.target.value) } }))} className="h-10 bg-white font-black" />
                              </div>
                          </div>
                          <div className="space-y-3">
                              <p className="text-[9px] font-bold text-indigo-400 uppercase">Sectoral Breakdown (Teaching Faculty)</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {GAD_SECTORS.map(sec => (
                                      <div key={sec} className="p-2 rounded-lg bg-white border border-indigo-100 flex flex-col gap-2">
                                          <p className="text-[8px] font-black uppercase truncate">{sec}</p>
                                          <div className="flex gap-1">
                                              <Input type="number" placeholder="M" value={censusForm.teaching?.sectors?.[sec]?.male || 0} onChange={(e) => setCensusForm(prev => ({ ...prev, teaching: { ...prev.teaching!, sectors: { ...prev.teaching!.sectors, [sec]: { ...prev.teaching!.sectors![sec] || { female: 0 }, male: Number(e.target.value) } } } }))} className="h-6 text-[9px] w-full px-1 text-center" />
                                              <Input type="number" placeholder="F" value={censusForm.teaching?.sectors?.[sec]?.female || 0} onChange={(e) => setCensusForm(prev => ({ ...prev, teaching: { ...prev.teaching!, sectors: { ...prev.teaching!.sectors, [sec]: { ...prev.teaching!.sectors![sec] || { male: 0 }, female: Number(e.target.value) } } } }))} className="h-6 text-[9px] w-full px-1 text-center" />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </section>

                      {/* NON-TEACHING CENSUS */}
                      <section className="space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-800 border-b pb-1 flex items-center gap-2">
                              <Users className="h-4 w-4" /> 2. Non-Teaching Staff (Unit Total)
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-500">Total Male</Label>
                                  <Input type="number" value={censusForm.nonTeaching?.male} onChange={(e) => setCensusForm(prev => ({ ...prev, nonTeaching: { ...prev.nonTeaching!, male: Number(e.target.value) } }))} className="h-10 bg-white font-black" />
                              </div>
                              <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-500">Total Female</Label>
                                  <Input type="number" value={censusForm.nonTeaching?.female} onChange={(e) => setCensusForm(prev => ({ ...prev, nonTeaching: { ...prev.nonTeaching!, female: Number(e.target.value) } }))} className="h-10 bg-white font-black" />
                              </div>
                          </div>
                          <div className="space-y-3">
                              <p className="text-[9px] font-bold text-indigo-400 uppercase">Sectoral Breakdown (Staff)</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {GAD_SECTORS.map(sec => (
                                      <div key={sec} className="p-2 rounded-lg bg-white border border-indigo-100 flex flex-col gap-2">
                                          <p className="text-[8px] font-black uppercase truncate">{sec}</p>
                                          <div className="flex gap-1">
                                              <Input type="number" placeholder="M" value={censusForm.nonTeaching?.sectors?.[sec]?.male || 0} onChange={(e) => setCensusForm(prev => ({ ...prev, nonTeaching: { ...prev.nonTeaching!, sectors: { ...prev.nonTeaching!.sectors, [sec]: { ...prev.nonTeaching!.sectors![sec] || { female: 0 }, male: Number(e.target.value) } } } }))} className="h-6 text-[9px] w-full px-1 text-center" />
                                              <Input type="number" placeholder="F" value={censusForm.nonTeaching?.sectors?.[sec]?.female || 0} onChange={(e) => setCensusForm(prev => ({ ...prev, nonTeaching: { ...prev.nonTeaching!, sectors: { ...prev.nonTeaching!.sectors, [sec]: { ...prev.nonTeaching!.sectors![sec] || { male: 0 }, female: Number(e.target.value) } } } }))} className="h-6 text-[9px] w-full px-1 text-center" />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </section>
                  </div>
              </CardContent>
              <CardFooter className="bg-indigo-100/30 border-t py-4 px-8">
                  <div className="flex items-start gap-3">
                      <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-indigo-800/80 leading-relaxed italic font-medium">
                          <strong>Data Accuracy Mandate:</strong> This census provides the denominator for unit-wide gender participation rates. Ensure these numbers reflect the actual verified personnel list of your office or unit for the selected year.
                      </p>
                  </div>
              </CardFooter>
          </Card>
      )}

      {/* INDIVIDUAL UNIT SDD EXPLORER */}
      {(isAdmin || userRole?.toLowerCase().includes('director') || userRole?.toLowerCase().includes('odimo')) && (
          <UnitSddExplorer 
            compliances={compliances}
            units={units}
            selectedYear={selectedYear}
          />
      )}

      <Card className="border-primary/10 shadow-md">
        <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional SDD Reporting Guidelines</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="p-6 flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-2">
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    The RSU EOMS Portal automatically consolidates SDD from academic monitoring (students) and the personnel census (employees). This data is critical for generating the university's <strong>GAD Accomplishment Reports</strong> for the Philippine Commission on Women.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
