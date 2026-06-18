'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, getDocs } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ShieldCheck, 
  ClipboardList, 
  Info, 
  School, 
  Building,
  CheckCircle2,
  XCircle,
  Globe,
  Radio
} from 'lucide-react';
import type { CsmSettings, CsmDeployment, Unit, Campus, Cycle } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const csmSettingsSchema = z.object({
  managingUnitId: z.string().min(1, 'Please select the designated CSM managing unit.'),
  csmDirector: z.string().min(1, 'CSM Director name is required.'),
  csmQualityHead: z.string().min(1, 'CSM Quality Head name is required.'),
  csmCampusCoordinator: z.string().min(1, 'CSM Campus Coordinator name is required.'),
});

export function CsmSettingsManagement() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [deployingIds, setDeployingIds] = useState<Record<string, boolean>>({});

  // Fetch CSM Settings
  const csmSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'csmSettings') : null),
    [firestore]
  );
  const { data: currentSettings, isLoading: isLoadingSettings } = useDoc<CsmSettings>(csmSettingsRef);

  // Fetch Campuses
  const campusesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campuses') : null),
    [firestore]
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  // Fetch Units
  const unitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);



  const form = useForm<z.infer<typeof csmSettingsSchema>>({
    resolver: zodResolver(csmSettingsSchema),
    defaultValues: {
      managingUnitId: '',
      csmDirector: '',
      csmQualityHead: '',
      csmCampusCoordinator: '',
    },
  });

  // Filter units based on selected campus
  const filteredUnits = useMemo(() => {
    if (!units || !selectedCampusId) return [];
    return units
      .filter(u => u.campusIds?.includes(selectedCampusId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [units, selectedCampusId]);

  // Sync state from database settings
  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.managingUnitId && units && units.length > 0) {
        const targetUnit = units.find(u => u.id === currentSettings.managingUnitId);
        if (targetUnit && targetUnit.campusIds && targetUnit.campusIds.length > 0) {
          if (!selectedCampusId || !targetUnit.campusIds.includes(selectedCampusId)) {
            setSelectedCampusId(targetUnit.campusIds[0]);
          }
          
          if (form.getValues('managingUnitId') !== targetUnit.id) {
            form.setValue('managingUnitId', targetUnit.id);
          }
        }
      }
      
      if (currentSettings.csmDirector && form.getValues('csmDirector') !== currentSettings.csmDirector) {
        form.setValue('csmDirector', currentSettings.csmDirector);
      }
      if (currentSettings.csmQualityHead && form.getValues('csmQualityHead') !== currentSettings.csmQualityHead) {
        form.setValue('csmQualityHead', currentSettings.csmQualityHead);
      }
      if (currentSettings.csmCampusCoordinator && form.getValues('csmCampusCoordinator') !== currentSettings.csmCampusCoordinator) {
        form.setValue('csmCampusCoordinator', currentSettings.csmCampusCoordinator);
      }
    }
  }, [currentSettings, units, form, selectedCampusId]);

  const onSubmit = async (values: z.infer<typeof csmSettingsSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(firestore, 'system', 'csmSettings'), {
        ...values,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile.id,
      }, { merge: true });
      toast({ 
        title: 'CSM Authority Designated', 
        description: 'The selected unit will now act as the official CSM monitoring department.' 
      });
    } catch (error) {
      console.error('Error updating CSM settings:', error);
      toast({
        title: 'Designation Failed',
        description: 'Could not designate CSM settings.',
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
      <Card className="max-w-2xl border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 border-b">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">CSM Monitoring Governance</span>
          </div>
          <CardTitle>ARTA Client Satisfaction Measurement (CSM) Governance</CardTitle>
          <CardDescription>
            Designate the office responsible for university-wide CSM monitoring, auditing, and report deployment.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-6">
              
              {/* STEP 1: SELECT CAMPUS */}
              <div className="space-y-2">
                <FormLabel className="text-xs font-bold uppercase text-slate-700">Step 1: Select Site / Campus</FormLabel>
                <Select value={selectedCampusId} onValueChange={(val) => { setSelectedCampusId(val); form.setValue('managingUnitId', ''); }}>
                  <SelectTrigger className="h-11 font-bold">
                    <School className="h-4 w-4 mr-2 opacity-40" />
                    <SelectValue placeholder="Select Campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses?.sort((a,b) => a.name.localeCompare(b.name)).map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">Filtering units by site ensures the correct department is identified.</p>
              </div>

              {/* STEP 2: SELECT UNIT */}
              <FormField
                control={form.control}
                name="managingUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-700">Step 2: Designated CSM Managing Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedCampusId}>
                      <FormControl>
                        <SelectTrigger className="h-11 font-bold">
                          <Building className="h-4 w-4 mr-2 opacity-40" />
                          <SelectValue placeholder={selectedCampusId ? "Select Unit / Office" : "Waiting for Campus selection..."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[10px]">
                      Personnel belonging to this unit (e.g. **IPDU**) will receive global access to view, audit, and deploy CSM metrics, feedback reports, and decision support analytics.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-blue-800">Authority Note</p>
                  <p className="text-[10px] text-blue-700 leading-relaxed italic">
                    By default, the designated department handles institutional coordination and prepares annual satisfaction monitoring reports for ARTA submission.
                  </p>
                </div>
              </div>

              {/* STEP 3: CSM SIGNATORIES */}
              <div className="space-y-4 pt-4 border-t">
                <FormLabel className="text-xs font-black uppercase text-slate-700">Step 3: CSM Report Signatories</FormLabel>
                <FormDescription className="text-[10px]">
                  These names will appear as official signatories on all generated CSM reports (Harmonized Agency Report, Campus Performance Export, CAIP Matrix).
                </FormDescription>
                
                <FormField
                  control={form.control}
                  name="csmDirector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-700">CSM Director (Prepared By)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., DR. JUAN DELA CRUZ" {...field} className="font-bold" />
                      </FormControl>
                      <FormDescription className="text-[10px]">Overall responsible official for CSM program implementation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="csmQualityHead"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-700">CSM Quality Assurance Head (Reviewed By)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter name" {...field} className="font-semibold" />
                        </FormControl>
                        <FormDescription className="text-[10px]">Reviews and validates CSM data quality and compliance.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="csmCampusCoordinator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-700">Campus CSM Coordinator (Noted By)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter name" {...field} className="font-semibold" />
                        </FormControl>
                        <FormDescription className="text-[10px]">Campus-level coordinator for CSM deployment and monitoring.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-4">
              <Button type="submit" disabled={isSubmitting || !selectedCampusId || !form.watch('managingUnitId') || !form.watch('csmDirector') || !form.watch('csmQualityHead') || !form.watch('csmCampusCoordinator')} className="shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Confirm CSM Authority
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

    </div>
  );
}
