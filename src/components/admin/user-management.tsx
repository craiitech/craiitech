'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User, Role, Campus, Unit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { EditUserDialog } from './edit-user-dialog';

type FilterStatus = 'all' | 'pending' | 'verified';

export function UserManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<User>(usersQuery);

  const rolesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'roles') : null),
    [firestore]
  );
  const { data: roles, isLoading: isLoadingRoles } =
    useCollection<Role>(rolesQuery);

  const campusesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campuses') : null),
    [firestore]
  );
  const { data: campuses, isLoading: isLoadingCampuses } =
    useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: units, isLoading: isLoadingUnits } =
    useCollection<Unit>(unitsQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (filter === 'all') return users;
    return users.filter((user) =>
      filter === 'pending' ? !user.verified : user.verified
    );
  }, [users, filter]);

  const getRoleName = (roleId: string) =>
    roles?.find((r) => r.id === roleId)?.name || 'N/A';
  const getCampusName = (campusId: string) =>
    campuses?.find((c) => c.id === campusId)?.name || 'N/A';
  const getUnitName = (unitId: string) =>
    units?.find((u) => u.id === unitId)?.name || 'N/A';

  const handleVerification = async (userId: string, isVerified: boolean) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userRef, { verified: isVerified });
      toast({
        title: 'Success',
        description: `User has been ${
          isVerified ? 'verified' : 'unverified'
        }.`,
      });
    } catch (error) {
      console.error('Error updating user verification:', error);
      toast({
        title: 'Error',
        description: 'Could not update user verification status.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!firestore || !deletingUser) return;
    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', deletingUser.id);
    try {
        await deleteDoc(userRef);
        toast({
            title: "User Deleted",
            description: `${deletingUser.firstName} ${deletingUser.lastName} has been removed.`,
        });
        setDeletingUser(null);
    } catch (error) {
        console.error("Error deleting user:", error);
        toast({
            title: "Error",
            description: "Could not delete user.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  const isLoading =
    isLoadingUsers || isLoadingRoles || isLoadingCampuses || isLoadingUnits;

  const descriptionText = {
    all: `A list of all ${users?.length || 0} users in the system.`,
    pending: `${filteredUsers.length} users are awaiting verification.`,
    verified: `There are ${filteredUsers.length} verified users.`,
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle>User Management</CardTitle>
                <CardDescription>
                {descriptionText[filter]}
                </CardDescription>
            </div>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterStatus)} >
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="verified">Verified</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Campus</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.firstName} />
                        <AvatarFallback>
                          {user.firstName?.charAt(0)}
                          {user.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getRoleName(user.roleId)}</Badge>
                  </TableCell>
                  <TableCell>{getCampusName(user.campusId)}</TableCell>
                  <TableCell>{getUnitName(user.unitId)}</TableCell>
                  <TableCell>
                    <Badge variant={user.verified ? 'default' : 'secondary'}>
                      {user.verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            handleVerification(user.id, !user.verified)
                          }
                        >
                          {user.verified ? 'Mark as Pending' : 'Verify User'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingUser(user)}>
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeletingUser(user)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
         {!isLoading && filteredUsers.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
                No {filter} users found.
            </div>
        )}
      </CardContent>
    </Card>
    {editingUser && (
        <EditUserDialog 
            user={editingUser}
            isOpen={!!editingUser}
            onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}
            roles={roles || []}
            campuses={campuses || []}
            units={units || []}
        />
    )}

    <AlertDialog open={!!deletingUser} onOpenChange={(isOpen) => !isOpen && setDeletingUser(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the account for{' '}
                    <span className="font-bold">{deletingUser?.firstName} {deletingUser?.lastName}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
