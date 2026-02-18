
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { User, Role, Campus, Unit } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useSessionActivity } from '@/lib/activity-log-provider';

interface EditUserDialogProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  roles: Role[];
  campuses: Campus[];
  units: Unit[];
}

const editUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleId: z.string().min(1, 'Role is required'),
  campusId: z.string().min(1, 'Campus is required'),
  unitId: z.string().optional(),
});

export function EditUserDialog({
  user,
  isOpen,
  onOpenChange,
  roles,
  campuses,
  units,
}: EditUserDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logSessionActivity } = useSessionActivity();

  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      roleId: '',
      campusId: '',
      unitId: '',
    },
  });

  // Effect to reset form when user or dialog state changes
  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        roleId: user.roleId || '',
        campusId: user.campusId || '',
        unitId: user.unitId || '',
      });
    }
  }, [user, isOpen, form]);
  
  const selectedRoleId = form.watch('roleId');
  const selectedCampusId = form.watch('campusId');

  // Logic to determine if a unit assignment is necessary based on the selected role
  const isUnitRequired = useMemo(() => {
    if (!selectedRoleId || !roles) return false;
    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) return false;
    
    // Roles that are campus-level or institutional (like Auditors) don't require a specific unit
    const campusLevelRoles = ['campus director', 'campus odimo', 'auditor', 'admin'];
    return !campusLevelRoles.includes(selectedRole.name.toLowerCase());
  }, [selectedRoleId, roles]);

  // Filter units based on the selected campus for better data integrity
  const unitsForCampus = useMemo(() => {
    if (!selectedCampusId || !units) return [];
    return units.filter(u => u.campusIds?.includes(selectedCampusId));
  }, [selectedCampusId, units]);

  const onSubmit = async (values: z.infer<typeof editUserSchema>) => {
    if (!firestore || !user?.id) {
        toast({ title: 'Error', description: 'User identifier is missing.', variant: 'destructive' });
        return;
    }
    
    if (isUnitRequired && !values.unitId) {
        form.setError('unitId', { type: 'manual', message: 'Unit assignment is required for this role.' });
        return;
    }

    setIsSubmitting(true);
    
    const userRef = doc(firestore, 'users', user.id);
    const selectedRole = roles.find(r => r.id === values.roleId);
    
    // Construct the payload explicitly to ensure field consistency
    const updateData = {
        firstName: values.firstName,
        lastName: values.lastName,
        roleId: values.roleId,
        role: selectedRole ? selectedRole.name : (user.role || ''),
        campusId: values.campusId,
        unitId: isUnitRequired ? (values.unitId || '') : '',
    };

    // Use updateDoc for a single document modification
    updateDoc(userRef, updateData)
        .then(() => {
            logSessionActivity(`Administrator updated user profile: ${user.email}`, { 
                action: 'admin_edit_user', 
                details: { targetUserId: user.id, changes: updateData } 
            });
            toast({
                title: 'Changes Applied',
                description: `${values.firstName} ${values.lastName}'s account has been updated successfully.`,
            });
            onOpenChange(false);
        })
        .catch(async (error) => {
            console.error('Error applying user updates:', error);
            // Surface security rule denials or other Firestore errors
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit User Account</DialogTitle>
          <DialogDescription>
            Administrator override for {user.firstName} {user.lastName}. Update their identity or institutional assignment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                        <Input {...field} placeholder="Enter first name" disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                        <Input {...field} placeholder="Enter last name" disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institutional Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assigned role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
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
              name="campusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Campus</FormLabel>
                  <Select 
                    onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('unitId', ''); // Reset unit when campus changes to ensure consistency
                    }} 
                    value={field.value || ''} 
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campus" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {campuses.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isUnitRequired && (
                <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Assigned Unit / Office</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting || !selectedCampusId}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={selectedCampusId ? "Select a unit" : "Select a campus first"} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {unitsForCampus.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                            </SelectItem>
                        ))}
                        {selectedCampusId && unitsForCampus.length === 0 && (
                            <div className="p-4 text-xs text-muted-foreground italic text-center">No units found for this campus.</div>
                        )}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            <DialogFooter className="pt-4 border-t mt-4 gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
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
