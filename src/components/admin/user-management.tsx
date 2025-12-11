
'use client';

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
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { User, Role, Campus, Unit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function UserManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();

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
        description: `User has been ${isVerified ? 'verified' : 'unverified'}.`,
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

  const isLoading =
    isLoadingUsers || isLoadingRoles || isLoadingCampuses || isLoadingUnits;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          A list of all users in the system. You can verify, edit, or delete
          users.
        </CardDescription>
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
              {users?.map((user) => (
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
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleVerification(user.id, !user.verified)}
                        >
                          {user.verified ? 'Mark as Pending' : 'Verify User'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
