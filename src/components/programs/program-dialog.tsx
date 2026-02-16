
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { AcademicProgram, Campus, Unit } from '@/lib/types';
import { Loader2, GraduationCap } from 'lucide-react';

interface ProgramDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  program: AcademicProgram | null;
  campuses: Campus[];
}

const formSchema = z.object({
  name: z.string().min(5, 'Full program name is required.'),
  abbreviation: z.string().min(2, 'Program initials are required.'),
  campusId: z.string().min(1, 'Please select a campus.'),
  collegeId: z.string().min(1, 'Please select the parent Academic Unit.'),
  level: z.enum(['Undergraduate', 'Graduate', 'TVET']),
  isBoardProgram: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export function ProgramDialog({ isOpen, onOpenChange, program, campuses }: ProgramDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      abbreviation: '',
      campusId: '',
      collegeId: '',
      level: 'Undergraduate',
      isBoardProgram: false,
      isActive: true,
    },
  });

  const selectedCampusId = form.watch('campusId');

  const academicUnitsForCampus = useMemo(() => {
    if (!allUnits || !selectedCampusId) return [];
    return allUnits.filter(u => 
        u.campusIds?.includes(selectedCampusId) && 
        u.category === 'Academic'
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [allUnits, selectedCampusId]);

  useEffect(() => {
    if (program) {
      form.reset({
        ...program,
        isBoardProgram: program.isBoardProgram ?? false,
      });
    } else {
      form.reset({
        name: '',
        abbreviation: '',
        campusId: '',
        collegeId: '',
        level: 'Undergraduate',
        isBoardProgram: false,
        isActive: true,
      });
    }
  }, [program, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const id = program ? program.id : doc(collection(firestore, 'dummy')).id;
    const programRef = doc(firestore, 'academicPrograms', id);

    const programData = {
      id,
      ...values,
      updatedAt: serverTimestamp(),
    };
    
    try {
        await setDoc(programRef, programData, { merge: true });
        toast({ title: 'Success', description: `Program ${program ? 'updated' : 'registered'} successfully.` });
        onOpenChange(false);
    } catch (error) {
        console.error('Error saving program:', error);
        toast({ title: 'Error', description: 'Could not save academic program.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <GraduationCap className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Registry Configuration</span>
          </div>
          <DialogTitle>{program ? 'Modify' : 'Register'} Academic Program</DialogTitle>
          <DialogDescription>
            Configure the base parameters for a university degree offering.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Program Name</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., Bachelor of Science in Information Technology" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="abbreviation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initials / Abbreviation</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., BSIT" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="level" render={({ field }) => (
                <FormItem>
                  <FormLabel>Education Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                      <SelectItem value="TVET">TVET</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="campusId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Campus Site</FormLabel>
                  <Select onValueChange={(val) => { field.onChange(val); form.setValue('collegeId', ''); }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                    <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="collegeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Unit (Parent)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCampusId}>
                    <FormControl><SelectTrigger><SelectValue placeholder={selectedCampusId ? "Select Unit" : "Select Campus First"} /></SelectTrigger></FormControl>
                    <SelectContent>
                        {academicUnitsForCampus.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        {selectedCampusId && academicUnitsForCampus.length === 0 && (
                            <div className="p-4 text-[10px] text-muted-foreground italic">No units marked as 'Academic' in this campus.</div>
                        )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="isBoardProgram" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-primary/5 border-primary/10">
                <div className="space-y-0.5">
                  <FormLabel className="text-primary font-bold">Board Program</FormLabel>
                  <FormDescription className="text-[10px]">Does this program have a professional board licensure exam?</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Active Offering</FormLabel>
                  <FormDescription className="text-[10px]">Whether this program is currently accepting students.</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {program ? 'Update Registry' : 'Register Program'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
