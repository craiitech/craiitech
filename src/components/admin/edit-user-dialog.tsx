
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
import { useFirestore, useAuth } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { User, Role, Campus, Unit } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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
  const auth = useAuth();

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

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        campusId: user.campusId,
        unitId: user.unitId,
      });
    }
  }, [user, form]);
  
  const selectedRoleId = form.watch('roleId');
  const isUnitRequired = useMemo(() => {
    if (!selectedRoleId || !roles) return false;
    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) return false;
    const campusLevelRoles = ['campus director', 'campus odimo'];
    return !campusLevelRoles.includes(selectedRole.name.toLowerCase());
  }, [selectedRoleId, roles]);

  useEffect(() => {
    if (!isUnitRequired) {
      form.setValue('unitId', undefined);
      form.clearErrors('unitId');
    }
  }, [isUnitRequired, form]);


  const onSubmit = async (values: z.infer<typeof editUserSchema>) => {
    if (!firestore) return;
    
    if (isUnitRequired && !values.unitId) {
        form.setError('unitId', { type: 'manual', message: 'Unit is required for this role.' });
        return;
    }

    setIsSubmitting(true);
    
    const batch = writeBatch(firestore);
    const userRef = doc(firestore, 'users', user.id);
    const selectedRole = roles.find(r => r.id === values.roleId);
    const newRoleName = selectedRole?.name.toLowerCase() || '';
    const oldRoleName = user.role.toLowerCase() || '';
    
    const updateData = {
        ...values,
        unitId: isUnitRequired ? values.unitId : '',
        role: selectedRole ? selectedRole.name : '',
    };
    
    batch.update(userRef, updateData);

    // If the role has changed, update the role collections
    if (newRoleName !== oldRoleName) {
        // Delete from the old role collection
        let oldRoleCollectionName: string | null = null;
        if (oldRoleName === 'admin') oldRoleCollectionName = 'roles_admin';
        if (oldRoleName === 'campus odimo' || oldRoleName === 'campus director') oldRoleCollectionName = 'roles_campus_odimo';
        if (oldRoleName === 'unit odimo') oldRoleCollectionName = 'roles_unit_odimo';

        if (oldRoleCollectionName) {
            batch.delete(doc(firestore, oldRoleCollectionName, user.id));
        }

        // Add to the new role collection
        let newRoleCollectionName: string | null = null;
        if (newRoleName === 'admin') newRoleCollectionName = 'roles_admin';
        if (newRoleName === 'campus odimo' || newRoleName === 'campus director') newRoleCollectionName = 'roles_campus_odimo';
        if (newRoleName === 'unit odimo') newRoleCollectionName = 'roles_unit_odimo';
        
        if (newRoleCollectionName) {
            batch.set(doc(firestore, newRoleCollectionName, user.id), { uid: user.id });
        }
    }


    try {
        await batch.commit();

        toast({
            title: 'User Updated',
            description: `${values.firstName} ${values.lastName}'s profile and role have been updated.`,
        });
        
        onOpenChange(false);
    } catch (error) {
         console.error('Error updating user:', error);
         toast({ title: 'Error', description: 'Could not update user.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Modify the details for {user.firstName} {user.lastName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
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
                  <FormLabel>Campus</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
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

    