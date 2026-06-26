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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, collection } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { Unit, Campus } from '@/lib/types';
import { Loader2, Check, ChevronsUpDown, Link as LinkIcon, Search } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


interface EditUnitDialogProps {
  unit: Unit | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allCampuses: Campus[];
}

const editUnitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  category: z.enum(['Academic', 'Administrative', 'Research', 'Support']),
  campusIds: z.array(z.string()).optional(),
  vicePresidentId: z.string().optional(),
  formsDriveLink: z.string().url('Invalid Google Drive URL').optional().or(z.literal('')),
});

export function EditUnitDialog({
  unit,
  isOpen,
  onOpenChange,
  allCampuses,
}: EditUnitDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sticky unit state to prevent content vanishing during exit
  const [stickyUnit, setStickyUnit] = useState<Unit | null>(null);
  useEffect(() => {
    if (unit) setStickyUnit(unit);
  }, [unit]);

  const activeUnit = unit || stickyUnit;

  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits } = useCollection<Unit>(allUnitsQuery);

  const vpUnitOptions = useMemo(() => {
    if (!allUnits) return [];
    return allUnits.filter(u => {
      const name = u.name.toLowerCase();
      return (name.includes('vice president') || name.includes('president')) && u.id !== activeUnit?.id;
    });
  }, [allUnits, activeUnit?.id]);

  const form = useForm<z.infer<typeof editUnitSchema>>({
    resolver: zodResolver(editUnitSchema),
    defaultValues: {
      name: '',
      category: 'Administrative',
      campusIds: [],
      vicePresidentId: '',
      formsDriveLink: '',
    },
  });

  useEffect(() => {
    if (unit && isOpen) {
      form.reset({
        name: unit.name,
        category: unit.category || 'Administrative',
        campusIds: unit.campusIds || [],
        vicePresidentId: unit.vicePresidentId || '',
        formsDriveLink: unit.formsDriveLink || '',
      });
    }
  }, [unit, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof editUnitSchema>) => {
    if (!firestore || !activeUnit) return;

    setIsSubmitting(true);
    
    const unitRef = doc(firestore, 'units', activeUnit.id);
    
    const updateData = {
        name: values.name,
        category: values.category,
        campusIds: values.campusIds || [],
        vicePresidentId: values.vicePresidentId === 'none' ? '' : values.vicePresidentId || '',
        formsDriveLink: values.formsDriveLink || '',
    };

    updateDoc(unitRef, updateData)
        .then(() => {
            toast({
                title: 'Unit Updated',
                description: `The unit "${values.name}" has been updated.`,
            });
            onOpenChange(false);
        })
        .catch((error) => {
            console.error('Error updating unit:', error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: unitRef.path,
                operation: 'update',
                requestResourceData: updateData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const selectedCampusIds = form.watch('campusIds') || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {activeUnit && (
          <>
            <DialogHeader>
              <DialogTitle>Edit Unit</DialogTitle>
              <DialogDescription>
                Modify the details for the unit "{activeUnit.name}".
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent modal={false}>
                            <SelectItem value="Academic">Academic (Offers Programs)</SelectItem>
                            <SelectItem value="Administrative">Administrative Office</SelectItem>
                            <SelectItem value="Research">Research Center</SelectItem>
                            <SelectItem value="Support">Support Unit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                    control={form.control}
                    name="campusIds"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-1.5">
                          <FormLabel>Assigned Campuses</FormLabel>
                          <FormDescription className="text-[10px]">
                            Click on the campuses below to assign them to this unit.
                          </FormDescription>
                          <FormControl>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {allCampuses.map((campus) => {
                                const isSelected = field.value?.includes(campus.id);
                                return (
                                  <Badge
                                    key={campus.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const currentIds = field.value || [];
                                      const newIds = currentIds.includes(campus.id)
                                        ? currentIds.filter(id => id !== campus.id)
                                        : [...currentIds, campus.id];
                                      field.onChange(newIds);
                                    }}
                                    className={cn(
                                      "cursor-pointer px-3 py-1.5 text-[10px] font-black uppercase transition-all select-none border rounded-xl flex items-center gap-1.5 hover:scale-105 duration-150",
                                      isSelected
                                        ? "bg-primary border-primary text-white hover:bg-primary/90"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300"
                                    )}
                                  >
                                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                                    {campus.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="vicePresidentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vice President / Supervising Office</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Assign supervising office" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent modal={false}>
                          <SelectItem value="none">
                            None
                          </SelectItem>
                          {vpUnitOptions.map((vp) => (
                            <SelectItem key={vp.id} value={vp.id}>
                              {vp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formsDriveLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-bold flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Official Forms Drive (Admin Set)
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://drive.google.com/..." className="bg-primary/5" />
                      </FormControl>
                      <FormDescription className="text-[10px]">The master Google Drive area where this unit's official quality forms are maintained.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}