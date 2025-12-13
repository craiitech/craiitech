
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
} from '@/components/ui/form';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
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
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { Unit, Campus } from '@/lib/types';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';


interface EditUnitDialogProps {
  unit: Unit;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allCampuses: Campus[];
}

const editUnitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  campusIds: z.array(z.string()).optional(),
});

export function EditUnitDialog({
  unit,
  isOpen,
  onOpenChange,
  allCampuses
}: EditUnitDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false)

  const form = useForm<z.infer<typeof editUnitSchema>>({
    resolver: zodResolver(editUnitSchema),
    defaultValues: {
      name: '',
      campusIds: [],
    },
  });

  useEffect(() => {
    if (unit) {
      form.reset({
        name: unit.name,
        campusIds: unit.campusIds || [],
      });
    }
  }, [unit, form]);

  const onSubmit = async (values: z.infer<typeof editUnitSchema>) => {
    if (!firestore) return;

    setIsSubmitting(true);
    
    const unitRef = doc(firestore, 'units', unit.id);
    
    const updateData = {
        name: values.name,
        campusIds: values.campusIds || [],
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
        <DialogHeader>
          <DialogTitle>Edit Unit</DialogTitle>
          <DialogDescription>
            Modify the details for the unit "{unit.name}".
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
                name="campusIds"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Assigned Campuses</FormLabel>
                     <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                <div className="flex gap-1 flex-wrap">
                                  {selectedCampusIds.length > 0 ? (
                                    selectedCampusIds.map(id => (
                                      <Badge key={id} variant="secondary">
                                        {allCampuses.find(c => c.id === id)?.name || '...'}
                                      </Badge>
                                    ))
                                  ) : (
                                    "Select campuses"
                                  )}
                                </div>

                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search campus..." />
                                <CommandEmpty>No campus found.</CommandEmpty>
                                <CommandGroup>
                                {allCampuses.map((campus) => (
                                    <CommandItem
                                        value={campus.name}
                                        key={campus.id}
                                        onSelect={() => {
                                            const currentIds = form.getValues('campusIds') || [];
                                            const newIds = currentIds.includes(campus.id)
                                                ? currentIds.filter(id => id !== campus.id)
                                                : [...currentIds, campus.id];
                                            form.setValue("campusIds", newIds)
                                        }}
                                    >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value?.includes(campus.id)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {campus.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
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
      </DialogContent>
    </Dialog>
  );
}

