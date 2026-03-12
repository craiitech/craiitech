
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
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
import { Loader2, ShieldCheck, HandHeart, Info, School, Building } from 'lucide-react';
import type { GadSettings, Unit, Campus } from '@/lib/types';

const gadSettingsSchema = z.object({
  leadershipUnitId: z.string().min(1, 'Please select the institutional GAD leadership unit.'),
});

export function GadSettingsManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');

  const gadSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'gadSettings') : null),
    [firestore]
  );
  const { data: currentSettings, isLoading: isLoadingSettings } = useDoc<GadSettings>(gadSettingsRef);

  const campusesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campuses') : null),
    [firestore]
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const form = useForm<z.infer<typeof gadSettingsSchema>>({
    resolver: zodResolver(gadSettingsSchema),
    defaultValues: {
      leadershipUnitId: '',
    },
  });

  // Filter units based on selected campus
  const filteredUnits = useMemo(() => {
    if (!units || !selectedCampusId) return [];
    return units
      .filter(u => u.campusIds?.includes(selectedCampusId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [units, selectedCampusId]);

  // Effect to resolve campus and unit from existing settings
  useEffect(() => {
    if (currentSettings?.leadershipUnitId && units && !selectedCampusId) {
      const targetUnit = units.find(u => u.id === currentSettings.leadershipUnitId);
      if (targetUnit && targetUnit.campusIds && targetUnit.campusIds.length > 0) {
        setSelectedCampusId(targetUnit.campusIds[0]);
        form.setValue('leadershipUnitId', targetUnit.id);
      }
    }
  }, [currentSettings, units, selectedCampusId, form]);

  const onSubmit = async (values: z.infer<typeof gadSettingsSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(firestore, 'system', 'gadSettings'), {
        ...values,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({ 
        title: 'GAD Authority Updated', 
        description: 'The leadership unit has been designated and will now have institutional oversight in the GAD Corner.' 
      });
    } catch (error) {
      console.error('Error updating GAD settings:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update GAD settings. Please check your permissions.',
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
    <Card className="max-w-2xl border-primary/20 shadow-md">
      <CardHeader className="bg-primary/5 border-b">
        <div className="flex items-center gap-2 mb-1">
            <HandHeart className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Institutional GAD Governance</span>
        </div>
        <CardTitle>GAD Corner Administration</CardTitle>
        <CardDescription>
          Designate the office responsible for university-wide GAD monitoring and assessment.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            
            {/* STEP 1: SELECT CAMPUS */}
            <div className="space-y-2">
                <FormLabel className="text-xs font-bold uppercase text-slate-700">Step 1: Select Site / Campus</FormLabel>
                <Select value={selectedCampusId} onValueChange={(val) => { setSelectedCampusId(val); form.setValue('leadershipUnitId', ''); }}>
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
              name="leadershipUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-700">Step 2: Institutional GAD Leadership Unit</FormLabel>
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
                    All users belonging to this unit will be granted **Global Oversight** in the GAD Corner, allowing them to view and monitor every unit across all campuses.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-blue-800">Authority Elevation Note</p>
                    <p className="text-[10px] text-blue-700 leading-relaxed italic">
                        By selecting a leadership unit, you are establishing the primary GAD Office. Personnel in this office will be responsible for institutional SDD aggregation and GPB tracking.
                    </p>
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-4">
            <Button type="submit" disabled={isSubmitting || !selectedCampusId || !form.watch('leadershipUnitId')} className="shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Confirm GAD Authority
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
