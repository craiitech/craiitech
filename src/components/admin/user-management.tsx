'use client';

import { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MoreHorizontal,
  Loader2,
  UserCheck,
  UserX,
  ArrowUpDown,
  Search,
  Trash2,
  Undo2,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc } from '@/firebase/firestore-wrapper';
import type { User, Role, Campus, Unit, Signatories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { EditUserDialog } from './edit-user-dialog';
import { UserReportDialog } from './user-report-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Input } from '../ui/input';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'pending' | 'verified';
type SortConfig = {
  key: keyof User | 'role' | 'campus' | 'unit';
  direction: 'ascending' | 'descending';
} | null;

export function UserManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, userProfile } = useUser();
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logSessionActivity } = useSessionActivity();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'firstName', direction: 'ascending' });

  const usersQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'users') : null),
    [firestore, isAdmin],
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const rolesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'roles') : null), [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: currentSignatories } = useDoc<Signatories>(signatoryRef);

  const getRoleName = (roleId: string) => roles?.find((r) => r.id === roleId)?.name || 'N/A';
  const getCampusName = (campusId: string) => campuses?.find((c) => c.id === campusId)?.name || 'N/A';
  const getUserUnitName = (user: User) => {
    if (user.unitId) {
      const matched = units?.find((u) => u.id === user.unitId);
      if (matched) return matched.name;
    }
    if (user.unitName && user.unitName.trim() !== '') {
      return user.unitName;
    }
    const roleName = roles?.find((r) => r.id === user.roleId)?.name || user.role || '';
    const roleLower = roleName.toLowerCase();

    if (roleLower.includes('campus odimo') || roleLower.includes('campus director')) {
      const directorUnit = units?.find(
        (u) =>
          u.campusIds?.includes(user.campusId) &&
          (u.name.toLowerCase().includes('campus director') ||
            u.name.toLowerCase().includes('office of the campus director')),
      );
      return directorUnit?.name || 'Office of the Campus Director';
    }

    if (roleLower === 'auditor') {
      const iqaUnit = units?.find(
        (u) => u.name.toLowerCase() === 'internal quality audit' || u.name.toLowerCase() === 'iqa',
      );
      return iqaUnit?.name || 'Internal Quality Audit';
    }

    return 'N/A';
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = [...users];

    // Status filter
    if (filter !== 'all') {
      filtered = filtered.filter((user) => (filter === 'pending' ? !user.verified : user.verified));
    }

    // Search filter
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter((user) => {
        return (
          user.firstName?.toLowerCase().includes(lowercasedFilter) ||
          user.lastName?.toLowerCase().includes(lowercasedFilter) ||
          user.email?.toLowerCase().includes(lowercasedFilter) ||
          getRoleName(user.roleId).toLowerCase().includes(lowercasedFilter) ||
          getCampusName(user.campusId).toLowerCase().includes(lowercasedFilter) ||
          getUserUnitName(user).toLowerCase().includes(lowercasedFilter)
        );
      });
    }

    // Sorting
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortConfig.key) {
          case 'role':
            aValue = getRoleName(a.roleId);
            bValue = getRoleName(b.roleId);
            break;
          case 'campus':
            aValue = getCampusName(a.campusId);
            bValue = getCampusName(b.campusId);
            break;
          case 'unit':
            aValue = getUserUnitName(a);
            bValue = getUserUnitName(b);
            break;
          default:
            aValue = a[sortConfig.key as keyof User];
            bValue = b[sortConfig.key as keyof User];
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [users, filter, searchTerm, sortConfig, roles, campuses, units]);

  const requestSort = (key: keyof User | 'role' | 'campus' | 'unit') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof User | 'role' | 'campus' | 'unit') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const handleToggleActivation = async (userToToggle: User) => {
    if (!firestore) return;
    const newStatus = !userToToggle.verified;

    const userRef = doc(firestore, 'users', userToToggle.id);

    try {
      await updateDoc(userRef, { verified: newStatus });

      const action = newStatus ? 'activate_user' : 'deactivate_user';
      const description = `User ${userToToggle.email} has been ${newStatus ? 'activated' : 'deactivated'}.`;
      logSessionActivity(description, { action, details: { affectedUserId: userToToggle.id } });

      toast({ title: 'Success', description: 'User status has been updated.' });
    } catch (error) {
      console.error('Error updating user status:', error);
      const contextualError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'write',
        requestResourceData: { verified: newStatus },
      });
      errorEmitter.emit('permission-error', contextualError);
    }
  };

  const handleDeleteUser = async (targetUserId: string, email: string) => {
    if (!firestore || !targetUserId) return;
    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', targetUserId);
    try {
      await deleteDoc(userRef);
      logSessionActivity(`Deleted user: ${email}`, {
        action: 'delete_user',
        details: { affectedUserId: targetUserId },
      });
      toast({
        title: 'User Deleted',
        description: `${email} has been removed from the institutional registry.`,
      });
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Could not delete user account.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingUsers || isLoadingRoles || isLoadingCampuses || isLoadingUnits;

  const descriptionText = {
    all: `A list of all ${users?.length || 0} users in the system.`,
    pending: `${filteredUsers.length} users are awaiting verification or are inactive.`,
    verified: `There are ${filteredUsers.length} active users.`,
  };

  const getStatus = (user: User) => {
    if (user.verified) {
      return { variant: 'default', text: 'Active' };
    }
    if (!user.ndaAccepted) {
      return { variant: 'destructive', text: 'Awaiting NDA' };
    }
    return { variant: 'secondary', text: 'Inactive' };
  };

  return (
    <>
      <TooltipProvider>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>{descriptionText[filter]}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrintReportOpen(true)}
                  className="h-9 sm:h-10 text-xs font-black uppercase tracking-wider bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Printer className="h-4 w-4 text-primary" />
                  Print Report
                </Button>
                <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterStatus)}>
                  <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-flex sm:h-10 sm:w-auto">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Inactive</TabsTrigger>
                    <TabsTrigger value="verified">Active</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name, email, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full md:w-1/3"
              />
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
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('firstName')}>
                        User
                        {getSortIndicator('firstName')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('role')}>
                        Role
                        {getSortIndicator('role')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('campus')}>
                        Campus
                        {getSortIndicator('campus')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('unit')}>
                        Unit
                        {getSortIndicator('unit')}
                      </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const status = getStatus(user);
                    const isConfirming = confirmDeleteId === user.id;

                    return (
                      <TableRow
                        key={user.id}
                        className={cn('transition-colors', isConfirming && 'bg-rose-50/50 hover:bg-rose-100/50')}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar} alt={user.firstName} />
                              <AvatarFallback>
                                {user.firstName?.charAt(0)}
                                {user.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleName(user.roleId)}</Badge>
                        </TableCell>
                        <TableCell>{getCampusName(user.campusId)}</TableCell>
                        <TableCell>{getUserUnitName(user)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant as any}>{status.text}</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {isConfirming ? (
                            <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(null)}
                                className="h-8 text-[10px] font-black uppercase text-muted-foreground hover:bg-slate-200"
                                disabled={isSubmitting}
                              >
                                <Undo2 className="h-3 w-3 mr-1" />
                                Abort
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                className="h-8 text-[10px] font-black uppercase bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20"
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                Confirm?
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-full">
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          setTimeout(() => handleToggleActivation(user), 0);
                                        }}
                                        disabled={!user.ndaAccepted && !user.verified}
                                      >
                                        {user.verified ? (
                                          <>
                                            <UserX className="mr-2 h-4 w-4" /> Deactivate Account
                                          </>
                                        ) : (
                                          <>
                                            <UserCheck className="mr-2 h-4 w-4" /> Activate Account
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                    </div>
                                  </TooltipTrigger>
                                  {!user.ndaAccepted && !user.verified && (
                                    <TooltipContent>
                                      <p>User has not accepted the NDA.</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setTimeout(() => setEditingUser(user), 0);
                                  }}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive font-bold"
                                  onSelect={() => {
                                    setTimeout(() => setConfirmDeleteId(user.id), 0);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {!isLoading && filteredUsers.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">No users found for the current filter.</div>
            )}
          </CardContent>
        </Card>
      </TooltipProvider>

      <EditUserDialog
        user={editingUser}
        isOpen={!!editingUser}
        onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}
        roles={roles || []}
        campuses={campuses || []}
        units={units || []}
      />

      <UserReportDialog
        isOpen={isPrintReportOpen}
        onOpenChange={setIsPrintReportOpen}
        allUsers={users || []}
        filteredUsers={filteredUsers}
        roles={roles || []}
        campuses={campuses || []}
        units={units || []}
        signatories={currentSignatories}
        adminName={userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'System Administrator'}
        currentSearchTerm={searchTerm}
        currentFilterTab={filter}
      />
    </>
  );
}
