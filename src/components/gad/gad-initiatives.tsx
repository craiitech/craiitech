
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { GADInitiative, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    PlusCircle, 
    Search, 
    Trash2, 
    Edit, 
    MoreHorizontal,
    Target,
    HandHeart,
    Landmark,
    Info,
    ShieldCheck,
    Users,
    ChevronRight
} from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface GADInitiativesProps {
  initiatives: GADInitiative[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
}

const initiativeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Description is required.'),
  campusId: z.string().min(1, 'Campus is required.'),
  unitId: z.string().min(1, 'Unit is required.'),
  budget: z.coerce.number().min(0),
  utilizedAmount: z.coerce.number().min(0),
  beneficiariesMale: z.coerce.number().min(0),
  beneficiariesFemale: z.coerce.number().min(0),
  status: z.enum(['Planned', 'In Progress', 'Completed', 'Cancelled']),
});

export function GADInitiatives({ initiatives, campuses, units, selectedYear }: GADInitiativesProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<GADInitiative | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isGadCoordinator = (userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO') && !isAdmin;
  const canManage = isAdmin || userRole?.toLowerCase().includes('coordinator') || userRole?.toLowerCase().includes('director');

  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const filteredInitiatives = useMemo(() => {
    return initiatives.filter(i => 
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unitMap.get(i.unitId)?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [initiatives, searchTerm, unitMap]);

  const form = useForm<z.infer<typeof initiativeSchema>>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: {
      title: '',
      description: '',
      campusId: userProfile?.campusId || '',
      unitId: userProfile?.unitId || '',
      budget: 0,
      utilizedAmount: 0,
      beneficiariesMale: 0,
      beneficiariesFemale: 0,
      status: 'Planned',
    }
  });

  const onSubmit = async (values: z.infer<typeof initiativeSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...values,
        year: selectedYear,
        updatedAt: serverTimestamp(),
      };

      if (editingInitiative) {
        await updateDoc(doc(firestore, 'gadInitiatives', editingInitiative.id), data);
        toast({ title: 'Initiative Updated', description: 'Changes have been securely recorded.' });
      } else {
        await addDoc(collection(firestore, 'gadInitiatives'), { ...data, createdAt: serverTimestamp() });
        toast({ title: 'Initiative Registered', description: 'New GAD project added to the registry.' });
      }
      setIsDialogOpen(false);
      setEditingInitiative(null);
      form.reset();
    } catch (error) {
      toast({ title: 'Submission Failed', description: 'Could not save initiative.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Delete this initiative permanently?')) return;
    try {
      await deleteDoc(doc(firestore, 'gadInitiatives', id));
      toast({ title: 'Record Removed', description: 'The record has been deleted.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete record.', variant: 'destructive' });
    }
  };

  const handleEdit = (initiative: GADInitiative) => {
    setEditingInitiative(initiative);
    form.reset({
      title: initiative.title,
      description: initiative.description,
      campusId: initiative.campusId,
      unitId: initiative.unitId,
      budget: initiative.budget,
      utilizedAmount: initiative.utilizedAmount,
      beneficiariesMale: initiative.beneficiariesMale,
      beneficiariesFemale: initiative.beneficiariesFemale,
      status: initiative.status,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 shadow-sm"
          />
        </div>
        {canManage && (
          <Button onClick={() => { setEditingInitiative(null); form.reset({ campusId: userProfile?.campusId || '', unitId: userProfile?.unitId || '', title: '', description: '', budget: 0, utilizedAmount: 0, beneficiariesMale: 0, beneficiariesFemale: 0, status: 'Planned' }); setIsDialogOpen(true); }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
            <PlusCircle className="mr-2 h-4 w-4" /> Register GAD Project
          </Button>
        )}
      </div>

      <Card className="shadow-md border-primary/10 overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase pl-6 py-4">Initiative & Unit</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Budget Utilization</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Beneficiaries (M/F)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInitiatives.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/20 transition-colors group">
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">{item.title}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter mt-0.5">
                        {unitMap.get(item.unitId)} &bull; {campusMap.get(item.campusId)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 w-32">
                        <div className="flex justify-between text-[10px] font-black tabular-nums">
                            <span>₱{item.utilizedAmount.toLocaleString()}</span>
                            <span className="opacity-40">₱{item.budget.toLocaleString()}</span>
                        </div>
                        <Progress value={(item.utilizedAmount / (item.budget || 1)) * 100} className="h-1" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="h-5 text-[9px] font-black uppercase bg-primary/5 text-primary border-none">
                        M: {item.beneficiariesMale} | F: {item.beneficiariesFemale}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(
                        "h-5 text-[9px] font-black uppercase border-none px-2 shadow-sm",
                        item.status === 'Completed' ? "bg-emerald-600" : item.status === 'In Progress' ? "bg-blue-600" : "bg-amber-500"
                    )}>
                        {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase">Project Controls</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(item)} className="text-xs font-bold">
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        {isAdmin && (
                            <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-xs font-bold text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Record
                            </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInitiatives.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                        <HandHeart className="h-10 w-10" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No unit projects registered</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <Target className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Project Enrollment</span>
            </div>
            <DialogTitle>{editingInitiative ? 'Update' : 'Register'} Unit GAD Initiative</DialogTitle>
            <DialogDescription className="text-xs">Capture metadata for the GAD Plan and Budget (GPB) alignment.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 bg-white">
            <div className="p-8">
                <Form {...form}>
                    <form id="initiative-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Info className="h-3 w-3" /> Basic Project Identity
                            </h4>
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Project Title</FormLabel><FormControl><Input {...field} placeholder="e.g., Sensitivity Training for Unit Coordinators" className="bg-slate-50 font-bold" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Activity Description</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="Explain the purpose and expected GAD impact..." className="bg-slate-50 text-xs" /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Campus Site</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isGadCoordinator}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                        <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="unitId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Executing Unit</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isGadCoordinator}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                                        <SelectContent>{units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>

                        <div className="space-y-4 pt-6 border-t">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                                <Landmark className="h-3 w-3" /> GPB Fiscal Alignment
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="budget" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Planned Budget (₱)</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-50 font-mono font-bold" /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="utilizedAmount" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Actual Utilization (₱)</FormLabel><FormControl><Input type="number" {...field} className="bg-emerald-50/50 font-mono font-bold border-emerald-100" /></FormControl></FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Users className="h-3 w-3" /> Disaggregated Reach
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="beneficiariesMale" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Male Beneficiaries</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-50 font-bold" /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="beneficiariesFemale" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Female Beneficiaries</FormLabel><FormControl><Input type="number" {...field} className="bg-slate-50 font-bold" /></FormControl></FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="pt-6 border-t">
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Execution Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-primary/5 border-primary/20 h-11 font-black uppercase text-[10px] tracking-widest"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Planned">Planned</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem></SelectContent></Select></FormItem>
                            )} />
                        </div>
                    </form>
                </Form>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <div className="flex w-full items-center justify-between">
                <Button type="button" variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                <Button type="submit" form="initiative-form" disabled={isSubmitting} className="min-w-[200px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest h-11">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    {editingInitiative ? 'Save Changes' : 'Register Project'}
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
