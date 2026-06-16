'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
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
  FileSpreadsheet,
  Edit,
  Users,
  Eye,
  EyeOff,
  UserPlus,
  UserCheck,
  X
} from 'lucide-react';
import type { Campus, Unit, Employee, GADSector } from '@/lib/types';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const GAD_SECTORS: GADSector[] = ['Solo Parent', 'PWD', 'Senior Citizen', 'Youth/Student', 'Employee', 'LGBTQA++', 'Indigenous People'];

export default function VisitorLogbookSettingsPage() {
  const firestore = useFirestore();
  const { userProfile, isAdmin, isUserLoading } = useUser();
  const { toast } = useToast();

  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [newService, setNewService] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Personnel Registry States
  const [empName, setEmpName] = useState<string>('');
  const [empSex, setEmpSex] = useState<string>('');
  const [empType, setEmpType] = useState<string>('');
  const [empSectors, setEmpSectors] = useState<GADSector[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSavingPersonnel, setIsSavingPersonnel] = useState<boolean>(false);

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

  // Fetch employees for active unit
  const employeesQuery = useMemoFirebase(
    () => (firestore && activeUnitId ? query(collection(firestore, 'unitPersonnel'), where('unitId', '==', activeUnitId)) : null),
    [firestore, activeUnitId]
  );
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const handleSavePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !activeUnitId || !empName.trim() || !empSex || !empType) return;

    setIsSavingPersonnel(true);
    try {
      const empData = {
        name: empName.trim(),
        sex: empSex as 'Male' | 'Female' | 'LGBTQA+',
        type: empType as 'Teaching' | 'Non-Teaching',
        sectors: empSectors,
        unitId: activeUnitId,
        campusId: isAdmin ? selectedCampusId : (userProfile?.campusId || ''),
        isActive: editingEmployee ? editingEmployee.isActive : true,
        updatedAt: serverTimestamp(),
      };

      if (editingEmployee) {
        const docRef = doc(firestore, 'unitPersonnel', editingEmployee.id);
        await updateDoc(docRef, empData);
        toast({
          title: 'Employee Updated',
          description: `Successfully updated "${empName.trim()}" in the registry.`,
        });
      } else {
        const colRef = collection(firestore, 'unitPersonnel');
        await addDoc(colRef, {
          ...empData,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Employee Registered',
          description: `Successfully registered "${empName.trim()}".`,
        });
      }

      // Reset form
      setEmpName('');
      setEmpSex('');
      setEmpType('');
      setEmpSectors([]);
      setEditingEmployee(null);
    } catch (err) {
      console.error('Error saving personnel:', err);
      toast({
        title: 'Error',
        description: 'Failed to save employee details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPersonnel(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'unitPersonnel', employee.id);
      await updateDoc(docRef, {
        isActive: !employee.isActive,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: employee.isActive ? 'Employee Deactivated' : 'Employee Activated',
        description: `Successfully updated status for "${employee.name}".`,
      });
    } catch (err) {
      console.error('Error toggling employee status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update employee status.',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePersonnel = async (id: string, name: string) => {
    if (!firestore || !confirm(`Are you sure you want to delete "${name}" from the personnel registry?`)) return;
    try {
      const docRef = doc(firestore, 'unitPersonnel', id);
      await deleteDoc(docRef);
      toast({
        title: 'Employee Deleted',
        description: `Successfully removed "${name}" from the registry.`,
      });
    } catch (err) {
      console.error('Error deleting employee:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete employee.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = isUserLoading || isLoadingSettings || isLoadingEmployees || (isAdmin && (isLoadingCampuses || isLoadingUnits));
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
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#1B6535]/5 p-1 rounded-xl mb-6 border border-[#1B6535]/10 shadow-sm">
                <TabsTrigger 
                  value="services" 
                  className="rounded-lg font-black uppercase text-xs tracking-wider py-2.5 data-[state=active]:bg-[#1B6535] data-[state=active]:text-white transition-all flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Services Directory
                </TabsTrigger>
                <TabsTrigger 
                  value="personnel" 
                  className="rounded-lg font-black uppercase text-xs tracking-wider py-2.5 data-[state=active]:bg-[#1B6535] data-[state=active]:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Personnel Registry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="outline-none">
                <Card className="border-primary/15 shadow-lg overflow-hidden flex flex-col h-full bg-white">
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
              </TabsContent>

              <TabsContent value="personnel" className="outline-none">
                <Card className="border-primary/15 shadow-lg overflow-hidden flex flex-col h-full bg-white">
                  <CardHeader className="bg-[#1B6535]/5 border-b py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[#1B6535] mb-1">
                          <Users className="h-5 w-5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Personnel Registry</span>
                        </div>
                        <CardTitle className="text-lg font-black uppercase text-slate-800">{activeUnitName}</CardTitle>
                        <CardDescription className="text-xs">
                          Manage the staff and employees of this unit/office.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-6 flex-1">
                    {/* Add/Edit Employee Form */}
                    <form onSubmit={handleSavePersonnel} className="space-y-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-[#1B6535] border-b pb-2 mb-2">
                        <UserPlus className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest font-black">
                          {editingEmployee ? 'Edit Personnel Details' : 'Register New Personnel'}
                        </span>
                        {editingEmployee && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setEditingEmployee(null);
                              setEmpName('');
                              setEmpSex('');
                              setEmpType('');
                              setEmpSectors([]);
                            }}
                            className="ml-auto h-7 px-2.5 text-xs font-bold text-slate-500 rounded-lg hover:bg-slate-100"
                          >
                            <X className="h-3 w-3 mr-1" /> Cancel Edit
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Name input */}
                        <div className="space-y-1.5 md:col-span-1">
                          <Label htmlFor="empName" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</Label>
                          <Input
                            id="empName"
                            type="text"
                            placeholder="e.g. Sarah Jane Fallaria"
                            value={empName}
                            onChange={(e) => setEmpName(e.target.value)}
                            required
                            disabled={isSavingPersonnel}
                            className="h-11 bg-white border-slate-200 placeholder-slate-400 focus-visible:ring-emerald-600 focus-visible:border-transparent rounded-xl"
                          />
                        </div>

                        {/* Sex select */}
                        <div className="space-y-1.5">
                          <Label htmlFor="empSex" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sex</Label>
                          <Select value={empSex} onValueChange={setEmpSex} disabled={isSavingPersonnel}>
                            <SelectTrigger className="h-11 bg-white border-slate-200 focus-visible:ring-emerald-600 focus-visible:border-transparent rounded-xl font-bold">
                              <SelectValue placeholder="Select Sex" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="LGBTQA+">LGBTQA+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Employee Type select */}
                        <div className="space-y-1.5">
                          <Label htmlFor="empType" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category</Label>
                          <Select value={empType} onValueChange={setEmpType} disabled={isSavingPersonnel}>
                            <SelectTrigger className="h-11 bg-white border-slate-200 focus-visible:ring-emerald-600 focus-visible:border-transparent rounded-xl font-bold">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Teaching">Teaching (Faculty)</SelectItem>
                              <SelectItem value="Non-Teaching">Non-Teaching (Staff)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* GAD Sectors Checklist */}
                      <div className="space-y-2 pt-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          GAD Corner Sectors (Optional - check all that apply)
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {GAD_SECTORS.map((sector) => {
                            const isChecked = empSectors.includes(sector);
                            return (
                              <div 
                                key={sector} 
                                className={cn(
                                  "flex items-center space-x-2 bg-white border p-2.5 rounded-xl transition-all cursor-pointer hover:bg-slate-50",
                                  isChecked ? "border-emerald-600/30 bg-emerald-50/20" : "border-slate-100"
                                )}
                                onClick={() => {
                                  if (isChecked) {
                                    setEmpSectors(empSectors.filter(s => s !== sector));
                                  } else {
                                    setEmpSectors([...empSectors, sector]);
                                  }
                                }}
                              >
                                <Checkbox
                                  id={`sector-${sector}`}
                                  checked={isChecked}
                                  onCheckedChange={() => {}} // Handled by div click
                                />
                                <Label htmlFor={`sector-${sector}`} className="text-[10px] font-bold uppercase tracking-wider text-slate-600 cursor-pointer select-none truncate">
                                  {sector}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="flex justify-end pt-2">
                        <Button 
                          type="submit" 
                          disabled={isSavingPersonnel || !empName.trim() || !empSex || !empType} 
                          className="h-11 px-6 bg-[#1B6535] hover:bg-[#1a5d31] text-white border border-[#D4AF37]/25 rounded-xl font-bold flex items-center justify-center gap-1.5"
                        >
                          {isSavingPersonnel ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              {editingEmployee ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                              {editingEmployee ? 'Update Details' : 'Register Employee'}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>

                    {/* Registered Employees Table */}
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registered Employees Directory</Label>
                      
                      {isLoadingEmployees ? (
                        <div className="text-center py-10">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Loading Directory...</p>
                        </div>
                      ) : (!employees || employees.length === 0) ? (
                        <div className="text-center py-10 border border-dashed rounded-2xl bg-slate-50/50">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No employees registered</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal max-w-xs mx-auto">
                            Visitors will type staff names manually in the visitor logbook kiosk.
                          </p>
                        </div>
                      ) : (
                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                  <th className="p-3.5 pl-5">Name</th>
                                  <th className="p-3.5">Sex</th>
                                  <th className="p-3.5">Category</th>
                                  <th className="p-3.5">GAD Sectors</th>
                                  <th className="p-3.5 text-center">Status</th>
                                  <th className="p-3.5 pr-5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                                {employees.sort((a,b) => a.name.localeCompare(b.name)).map((employee: Employee) => (
                                  <tr 
                                    key={employee.id} 
                                    className={cn(
                                      "hover:bg-slate-50/50 transition-colors",
                                      !employee.isActive && "opacity-60"
                                    )}
                                  >
                                    <td className="p-3.5 pl-5 font-black text-slate-900">{employee.name}</td>
                                    <td className="p-3.5">
                                      <span className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                                        employee.sex === 'Male' && "bg-blue-50 text-blue-700 border border-blue-100",
                                        employee.sex === 'Female' && "bg-rose-50 text-rose-700 border border-rose-100",
                                        employee.sex === 'LGBTQA+' && "bg-purple-50 text-purple-700 border border-purple-100"
                                      )}>
                                        {employee.sex}
                                      </span>
                                    </td>
                                    <td className="p-3.5">
                                      <span className={cn(
                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase",
                                        employee.type === 'Teaching' && "bg-emerald-50 text-emerald-800 border border-emerald-100",
                                        employee.type === 'Non-Teaching' && "bg-amber-50 text-amber-800 border border-amber-100"
                                      )}>
                                        {employee.type}
                                      </span>
                                    </td>
                                    <td className="p-3.5">
                                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                                        {(!employee.sectors || employee.sectors.length === 0) ? (
                                          <span className="text-[9px] font-medium text-slate-400 italic text-muted-foreground/60">None</span>
                                        ) : (
                                          employee.sectors.map((sec) => (
                                            <span key={sec} className="inline-flex items-center px-1.5 py-0.5 bg-indigo-50/60 text-indigo-700 border border-indigo-100/50 rounded text-[8px] font-bold">
                                              {sec}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleActive(employee)}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border transition-all",
                                          employee.isActive 
                                            ? "bg-emerald-50/50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-50" 
                                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-150"
                                        )}
                                        title={employee.isActive ? "Deactivate" : "Activate"}
                                      >
                                        {employee.isActive ? (
                                          <>
                                            <Eye className="h-3 w-3" /> Active
                                          </>
                                        ) : (
                                          <>
                                            <EyeOff className="h-3 w-3" /> Inactive
                                          </>
                                        )}
                                      </button>
                                    </td>
                                    <td className="p-3.5 pr-5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setEditingEmployee(employee);
                                            setEmpName(employee.name);
                                            setEmpSex(employee.sex);
                                            setEmpType(employee.type);
                                            setEmpSectors(employee.sectors || []);
                                          }}
                                          className="h-8 w-8 text-[#1B6535] hover:text-[#1a5d31] hover:bg-emerald-50 rounded-lg"
                                          title="Edit Details"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeletePersonnel(employee.id, employee.name)}
                                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                          title="Delete Employee"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t py-4 text-[10px] text-slate-500 italic flex items-center justify-between">
                    <span>Total Personnel: {employees?.length || 0}</span>
                    <span>Active: {employees?.filter(e => e.isActive).length || 0}</span>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>

      </div>
    </div>
  );
}
