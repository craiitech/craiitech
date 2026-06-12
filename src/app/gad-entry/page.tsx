
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Users, 
    ShieldCheck, 
    HandHeart, 
    Loader2, 
    CheckCircle2, 
    Info, 
    Smartphone,
    UserPlus,
    Calendar,
    Building,
    Target,
    LayoutList
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Campus, Unit, GadSettings, GADSector } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

const sectors: GADSector[] = ['Solo Parent', 'PWD', 'Senior Citizen', 'Youth/Student', 'Employee', 'LGBTQA++', 'Indigenous People'];

const sddSchema = z.object({
  activityName: z.string().min(5, 'Please provide the full name of the event.'),
  activityId: z.string().min(1, 'Official Activity ID/Code is required.'),
  campusId: z.string().min(1, 'Please select the host campus.'),
  implementingUnitId: z.string().min(1, 'Please select the office organizing this event.'),
  male: z.coerce.number().min(0),
  female: z.coerce.number().min(0),
  sectors: z.record(z.string(), z.object({
    male: z.coerce.number().min(0),
    female: z.coerce.number().min(0),
  })),
});

/**
 * PUBLIC GAD ENTRY PAGE
 * Unauthenticated route for participants/coordinators to log SDD via device ID.
 */
export default function PublicGadEntryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  // 1. Initialize Device Fingerprint
  useEffect(() => {
    let id = localStorage.getItem('rsu_eoms_gad_device_id');
    if (!id) {
        id = `dev-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
        localStorage.setItem('rsu_eoms_gad_device_id', id);
    }
    setDeviceId(id);
  }, []);

  // 2. Fetch Context Data
  const settingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'gadSettings') : null), [firestore]);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<GadSettings>(settingsRef);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const form = useForm<z.infer<typeof sddSchema>>({
    resolver: zodResolver(sddSchema),
    defaultValues: {
      activityName: '',
      activityId: '',
      campusId: '',
      implementingUnitId: '',
      male: 0,
      female: 0,
      sectors: sectors.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
    }
  });

  const watchCampusId = form.watch('campusId');
  const watchMale = form.watch('male');
  const watchFemale = form.watch('female');
  const watchSectors = form.watch('sectors');

  const onSubmit = async (values: z.infer<typeof sddSchema>) => {
    if (!firestore || !deviceId) return;
    
    if (!settings?.isPublicEntryEnabled) {
        toast({ title: 'Module Disabled', description: 'Institutional GAD data collection is currently closed.', variant: 'destructive' });
        return;
    }

    // Validation: Total in sectors cannot exceed grand total per sex
    const totalSectorMale = Object.values(values.sectors).reduce((acc, s) => acc + s.male, 0);
    const totalSectorFemale = Object.values(values.sectors).reduce((acc, s) => acc + s.female, 0);

    if (totalSectorMale > values.male || totalSectorFemale > values.female) {
        toast({ title: 'Validation Error', description: 'Total sector-based participants cannot exceed the grand total per sex identification.', variant: 'destructive' });
        return;
    }

    if (values.male + values.female === 0) {
        toast({ title: 'Invalid Headcount', description: 'Please provide at least one participant count.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'gadActivities'), {
        activityId: values.activityId,
        activityName: values.activityName,
        campusId: values.campusId,
        implementingUnitId: values.implementingUnitId,
        participants: {
          male: values.male,
          female: values.female,
          sectors: values.sectors,
        },
        year: new Date().getFullYear(),
        date: serverTimestamp(),
        deviceFingerprint: deviceId,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Data Recorded', description: 'Thank you! Your GAD SDD report has been securely registered.' });
      form.reset();
    } catch (e) {
      toast({ title: 'Submission Error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Improved loading state to prevent flickering "Registry Closed" during initial fetch
  if (isLoadingSettings) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing GAD Registry...</p>
          </div>
      );
  }

  if (!settings?.isPublicEntryEnabled) {
      return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
              <Card className="max-w-md text-center shadow-xl">
                  <CardHeader>
                      <div className="mx-auto h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                          <HandHeart className="h-10 w-10 text-slate-400 opacity-40" />
                      </div>
                      <CardTitle className="text-xl font-black uppercase text-slate-800">GAD Registry Closed</CardTitle>
                      <CardDescription>Public GAD data collection is currently offline. Please contact the Quality Assurance Office for assistance.</CardDescription>
                  </CardHeader>
              </Card>
          </div>
      );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 py-20 overflow-x-hidden">
      <div className="fixed inset-0 -z-10 h-full w-full">
          <Image src="/rsulogo.png" alt="RSU" fill className="object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white/90 backdrop-blur-[2px]" />
      </div>

      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20 mb-6">
                <HandHeart className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">Gender & Development Hub</h1>
            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Public SDD Collection Registry</p>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden bg-white/95">
          <CardHeader className="bg-primary/5 border-b py-8 px-10">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-black uppercase text-primary">Activity SDD Registration</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest">Secure Device Identification Active</CardDescription>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-primary/20 shadow-sm">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black font-mono text-primary">{deviceId.substring(0,12)}</span>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-10">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                    {/* SECTION 1: EVENT CONTEXT */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b pb-2">
                            <Target className="h-5 w-5 text-primary" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">1. Activity Identification</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="activityId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Official Activity Code</FormLabel><FormControl><Input {...field} placeholder="e.g. QAO-2025-001" className="bg-slate-50 font-mono font-bold" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="activityName" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Full Title of Activity</FormLabel><FormControl><Input {...field} placeholder="e.g. Sensitivity Workshop..." className="bg-slate-50 font-bold" /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Campus Site</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-11 bg-slate-50"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                        <SelectContent>{campuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="implementingUnitId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Implementing Office</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchCampusId}>
                                        <FormControl><SelectTrigger className="h-11 bg-slate-50"><SelectValue placeholder={watchCampusId ? "Select Office" : "Select Campus First"} /></SelectTrigger></FormControl>
                                        <SelectContent>{units?.filter(u => u.campusIds?.includes(watchCampusId)).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                    </div>

                    {/* SECTION 2: HEADCOUNT */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b pb-2">
                            <Users className="h-5 w-5 text-primary" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">2. Participant Headcount (Sex-Disaggregated)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="male" render={({ field }) => (
                                <FormItem className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center">
                                    <FormLabel className="text-xs font-black uppercase text-indigo-700 mb-4">Total Male</FormLabel>
                                    <FormControl><Input type="number" {...field} className="h-14 text-3xl font-black text-center bg-white border-none shadow-inner" /></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="female" render={({ field }) => (
                                <FormItem className="p-6 rounded-2xl bg-rose-50 border border-rose-100 flex flex-col items-center">
                                    <FormLabel className="text-xs font-black uppercase text-rose-700 mb-4">Total Female</FormLabel>
                                    <FormControl><Input type="number" {...field} className="h-14 text-3xl font-black text-center bg-white border-none shadow-inner" /></FormControl>
                                </FormItem>
                            )} />
                            <div className="p-6 rounded-2xl bg-slate-900 border-none flex flex-col items-center justify-center text-white">
                                <p className="text-xs font-black uppercase opacity-60 mb-2">Grand Total</p>
                                <span className="text-4xl font-black tabular-nums">{watchMale + watchFemale}</span>
                                <span className="text-[10px] font-bold opacity-40 mt-1 uppercase">Stakeholders Registered</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: SECTOR BREAKDOWN */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b pb-2">
                            <LayoutList className="h-5 w-5 text-primary" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">3. Sectoral Breakdown (Optional)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sectors.map((sector) => (
                                <div key={sector} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-4 group hover:border-primary/20 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-black uppercase text-slate-600">{sector}</p>
                                        <Badge variant="secondary" className="h-5 text-[10px] font-black bg-white border-none shadow-sm">{watchSectors[sector]?.male + watchSectors[sector]?.female} TOTAL</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name={`sectors.${sector}.male`} render={({ field }) => (
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-indigo-400">Male</Label>
                                                <Input type="number" {...field} className="h-8 text-xs font-black text-center bg-white" onChange={(e) => field.onChange(Number(e.target.value))} />
                                            </div>
                                        )} />
                                        <FormField control={form.control} name={`sectors.${sector}.female`} render={({ field }) => (
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-rose-400">Female</Label>
                                                <Input type="number" {...field} className="h-8 text-xs font-black text-center bg-white" onChange={(e) => field.onChange(Number(e.target.value))} />
                                            </div>
                                        )} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                        <Info className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase text-blue-900 tracking-tight">Institutional Compliance Standard</p>
                            <p className="text-[11px] text-blue-800/80 leading-relaxed font-medium italic">
                                Your input is utilized strictly for GAD Accomplishment Reporting (GAD AR) as mandated by the Philippine Commission on Women. Total participants per sector must not exceed the total headcount reported in Section 2.
                            </p>
                        </div>
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 animate-in slide-in-from-bottom-4">
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <ShieldCheck className="h-6 w-6 mr-2" />}
                        Submit Report to Registry
                    </Button>
                </form>
            </Form>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-6 px-10 text-center flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">&copy; 2025 Romblon State University - Quality Assurance Office</p>
            <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter">Integrated GAD Digital System v2.0</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
