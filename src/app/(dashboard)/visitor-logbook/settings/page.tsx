'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  Building,
  School,
  ArrowLeft,
  Settings,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import type { Campus, Unit } from '@/lib/types';
import Link from 'next/link';

export default function VisitorLogbookSettingsPage() {
  const firestore = useFirestore();
  const { userProfile, isAdmin, isUserLoading } = useUser();
  const { toast } = useToast();

  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [newService, setNewService] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch Campuses (Admin only)
  const campusesQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'campuses') : null),
    [firestore, isAdmin]
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  // Fetch Units (Admin only)
  const unitsQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'units') : null),
    [firestore, isAdmin]
  );
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  // Filter units for Admin dropdown
  const filteredUnits = useMemo(() => {
    if (!units || !selectedCampusId) return [];
    return units
      .filter(u => u.campusIds?.includes(selectedCampusId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [units, selectedCampusId]);

  // Determine active unit ID
  const activeUnitId = useMemo(() => {
    if (isAdmin) {
      return selectedUnitId;
    }
    return userProfile?.unitId || '';
  }, [isAdmin, selectedUnitId, userProfile?.unitId]);

  // Fetch settings for active unit
  const unitSettingsRef = useMemoFirebase(() => {
    if (!firestore || !activeUnitId) return null;
    return doc(firestore, 'unitCsmSettings', activeUnitId);
  }, [firestore, activeUnitId]);

  const { data: currentSettings, isLoading: isLoadingSettings } = useDoc<any>(unitSettingsRef);

  // Default dropdown selection for Admin
  useEffect(() => {
    if (isAdmin && userProfile) {
      if (userProfile.campusId) {
        setSelectedCampusId(userProfile.campusId);
      }
      if (userProfile.unitId) {
        setSelectedUnitId(userProfile.unitId);
      }
    }
  }, [isAdmin, userProfile]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !unitSettingsRef || !activeUnitId || !newService.trim()) return;

    setIsSaving(true);
    try {
      const services = currentSettings?.services || [];
      const cleanService = newService.trim();

      if (services.includes(cleanService)) {
        toast({
          title: 'Duplicate Service',
          description: 'This service is already listed.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const updatedServices = [...services, cleanService];
      await setDoc(unitSettingsRef, {
        unitId: activeUnitId,
        services: updatedServices,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile?.id || 'System',
      }, { merge: true });

      setNewService('');
      toast({
        title: 'Service Added',
        description: `Successfully added "${cleanService}" to the unit services.`,
      });
    } catch (err) {
      console.error('Error adding service:', err);
      toast({
        title: 'Save Failed',
        description: 'Could not add the service. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (serviceToDelete: string) => {
    if (!firestore || !unitSettingsRef || !activeUnitId) return;

    setIsSaving(true);
    try {
      const services = currentSettings?.services || [];
      const updatedServices = services.filter((s: string) => s !== serviceToDelete);

      await setDoc(unitSettingsRef, {
        services: updatedServices,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile?.id || 'System',
      }, { merge: true });

      toast({
        title: 'Service Removed',
        description: `Successfully removed "${serviceToDelete}".`,
      });
    } catch (err) {
      console.error('Error deleting service:', err);
      toast({
        title: 'Delete Failed',
        description: 'Could not remove the service.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || isLoadingSettings || (isAdmin && (isLoadingCampuses || isLoadingUnits));
  const activeUnitName = useMemo(() => {
    if (!activeUnitId) return '';
    if (isAdmin && units) {
      return units.find(u => u.id === activeUnitId)?.name || 'Selected Unit';
    }
    return userProfile?.unitName || 'Your Unit';
  }, [isAdmin, units, activeUnitId, userProfile?.unitName]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Loading CSM settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">CSM Settings & Unit Services</h2>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Configure services offered for Visitor Logbook purpose of visit and CSM surveys.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Admin controls (if Admin) or general instructions */}
        <div className="lg:col-span-1 space-y-6">
          {isAdmin && (
            <Card className="border-primary/10 shadow-md">
              <CardHeader className="bg-primary/5 border-b py-4">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Administrative Scope
                </CardTitle>
                <CardDescription className="text-xs">Select a unit to manage services.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">1. Select Campus</Label>
                  <Select value={selectedCampusId} onValueChange={(val) => { setSelectedCampusId(val); setSelectedUnitId(''); }}>
                    <SelectTrigger className="h-11 font-bold">
                      <School className="h-4 w-4 mr-2 opacity-40" />
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses?.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">2. Select Unit / Office</Label>
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={!selectedCampusId}>
                    <SelectTrigger className="h-11 font-bold">
                      <Building className="h-4 w-4 mr-2 opacity-40" />
                      <SelectValue placeholder={selectedCampusId ? "Select Unit" : "Select Campus first..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUnits.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/10 shadow-md">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                CSM Integration Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                <strong>Visitor Logbook Kiosk:</strong> Adding services here will dynamically transform the <em>Purpose of Visit</em> text box in the front-desk sign-in page into a clean selection dropdown.
              </p>
              <p>
                <strong>"Others" Option:</strong> A fallback `Others (Please specify)` option is automatically appended to the services dropdown so visitors can type a custom purpose if their concern is not listed.
              </p>
              <p>
                <strong>ARTA CSM Reports:</strong> Configuring services allows the system to aggregate client volumes, ratings, and feedback comments per service, giving your unit precise, actionable satisfaction data.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Services management */}
        <div className="lg:col-span-2">
          {!activeUnitId ? (
            <Card className="border-dashed border-primary/20 bg-primary/5 h-64 flex items-center justify-center">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Please select a unit to configure services.
              </p>
            </Card>
          ) : (
            <Card className="border-primary/15 shadow-lg overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-[#1B6535]/5 border-b py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#1B6535] mb-1">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Services Directory</span>
                  </div>
                  <CardTitle className="text-lg font-black uppercase text-slate-800">{activeUnitName}</CardTitle>
                  <CardDescription className="text-xs">
                    Define the customer-facing services provided by this office/unit.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6 flex-1">
                {/* Form to add a service */}
                <form onSubmit={handleAddService} className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      type="text"
                      placeholder="e.g. Issuance of Certificate, Consultation, Document Submission"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      required
                      disabled={isSaving}
                      className="h-11 bg-white border-slate-200 placeholder-slate-400 focus-visible:ring-emerald-600 focus-visible:border-transparent rounded-xl"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSaving || !newService.trim()} 
                    className="h-11 px-5 bg-[#1B6535] hover:bg-[#1a5d31] text-white border border-[#D4AF37]/25 rounded-xl font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </form>

                {/* List of services */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Services List</Label>
                  
                  {(!currentSettings?.services || currentSettings.services.length === 0) ? (
                    <div className="text-center py-10 border border-dashed rounded-2xl bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No services registered</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal max-w-xs mx-auto">
                        Visitor Logbook Kiosk will display the default free-text "Purpose of Visit" input box.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                      {currentSettings.services.map((service: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-all hover:bg-slate-50/80 shadow-sm"
                        >
                          <span className="text-xs font-bold text-slate-800">{service}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isSaving}
                            onClick={() => handleDeleteService(service)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="Remove Service"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t py-4 text-[10px] text-slate-500 italic flex items-center justify-between">
                <span>Total Services: {currentSettings?.services?.length || 0}</span>
                <span>Last Updated: {currentSettings?.updatedAt ? new Date(currentSettings.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
              </CardFooter>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
