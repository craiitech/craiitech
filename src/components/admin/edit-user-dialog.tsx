
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
import { setCustomClaims } from '@/lib/set-custom-claims';
import { getAuth } from 'firebase/auth';


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
    
    const userRef = doc(firestore, 'users', user.id);
    const selectedRole = roles.find(r => r.id === values.roleId);
    
    const updateData = {
        ...values,
        unitId: isUnitRequired ? values.unitId : '',
        role: selectedRole ? selectedRole.name : '',
    };

    try {
        await updateDoc(userRef, updateData);

        // After successfully updating Firestore, set the custom claims.
        const claimsResult = await setCustomClaims({
            uid: user.id,
            role: updateData.role,
            campusId: updateData.campusId,
        });

        if (claimsResult.success) {
            toast({
                title: 'User Updated',
                description: `${values.firstName} ${values.lastName}'s profile and permissions have been updated.`,
            });
             // Force a token refresh on the client if the current user is being edited
            const auth = getAuth();
            if (auth.currentUser && auth.currentUser.uid === user.id) {
                await auth.currentUser.getIdToken(true);
            }
        } else {
             toast({
                title: 'Partial Success: Profile Updated',
                description: `User profile was saved, but permissions failed to update: ${claimsResult.message}`,
                variant: 'destructive',
            });
        }

        onOpenChange(false);
    } catch (error) {
         console.error('Error updating user:', error);
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: updateData
        }));
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
