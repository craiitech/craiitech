'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  MoreHorizontal,
  ShieldCheck,
  Info,
  Undo2,
  CheckCircle2,
  Search,
  ArrowUpDown,
  X,
  Shield,
} from 'lucide-react';
import type { Role } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const roleSchema = z.object({
  name: z.string().min(3, 'Role name must be at least 3 characters.'),
  description: z.string().min(3, 'Description must be at least 3 characters.'),
});

interface EditRoleDialogProps {
  role: Role | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditRoleDialog({ role, isOpen, onOpenChange }: EditRoleDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (role && isOpen) {
      form.reset({
        name: role.name,
        description: role.description || '',
      });
    }
  }, [role, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof roleSchema>) => {
    if (!firestore || !role) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(firestore, 'roles', role.id), {
        ...values,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Role Updated',
        description: `Institutional changes for ${values.name} have been committed.`,
      });
      onOpenChange(false);
    } catch {
      toast({ title: 'Error', description: 'Could not update role.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Edit className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Registry Modification</span>
          </div>
          <DialogTitle>Edit Institutional Role</DialogTitle>
          <DialogDescription>Modify the authority name and description for the registry.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase">Role Title</FormLabel>
                  <FormControl>
                    <Input {...field} className="font-bold bg-slate-50 dark:bg-slate-800/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase">Description / Scope</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className="text-xs italic bg-slate-50 dark:bg-slate-800/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[120px] shadow-lg shadow-primary/20">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type SortConfig = {
  key: 'name';
  direction: 'ascending' | 'descending';
};

export function RoleManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });

  const firestore = useFirestore();
  const { toast } = useToast();

  const rolesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'roles') : null), [firestore]);
  const { data: roles, isLoading } = useCollection<Role>(rolesQuery);

  const form = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = async (values: z.infer<typeof roleSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'roles'), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'New institutional role registered.' });
      form.reset();
    } catch (error) {
      console.error('Error creating role:', error);
      toast({ title: 'Error', description: 'Could not create role.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(firestore, 'roles', role.id));
      toast({ title: 'Role Deleted', description: 'Institutional registry has been updated.' });
      setConfirmDeleteId(null);
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSort = () => {
    setSortConfig((prev) => ({
      key: 'name',
      direction: prev.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };

  const filteredAndSortedRoles = useMemo(() => {
    if (!roles) return [];
    let list = [...roles];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)),
      );
    }

    list.sort((a, b) => {
      const valA = (a.name || '').toLowerCase();
      const valB = (b.name || '').toLowerCase();
      return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [roles, searchTerm, sortConfig]);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5 border-b py-6">
            <div className="flex items-center gap-2 text-primary mb-1">
              <PlusCircle className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Provisioning</span>
            </div>
            <CardTitle>Add New Role</CardTitle>
            <CardDescription>Establish a new authorized role for university personnel.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4 pt-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase">Role Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Campus Director" {...field} className="h-10 font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase">Role Responsibilities</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Define the access scope for this role..."
                          {...field}
                          rows={4}
                          className="text-xs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full shadow-lg shadow-primary/20 font-black uppercase text-xs tracking-widest"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  Register New Role
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30 border-b py-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight">
                  Institutional Role Registry
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                  List of all verified university roles.
                </CardDescription>
              </div>
              {roles && (
                <Badge variant="outline" className="h-6 text-[10px] font-black uppercase px-2 w-fit">
                  {filteredAndSortedRoles.length} of {roles.length} Roles
                </Badge>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search roles by title or scope..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-9 text-xs bg-background"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64 opacity-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAndSortedRoles.length > 0 ? (
              <ScrollArea className="h-[380px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase pl-6 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 text-[10px] font-black uppercase tracking-wider hover:bg-transparent"
                          onClick={toggleSort}
                        >
                          Role Name
                          <ArrowUpDown className="ml-1.5 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase py-3">Responsibilities</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase py-3 pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedRoles.map((role) => {
                      const isConfirming = confirmDeleteId === role.id;
                      return (
                        <TableRow
                          key={role.id}
                          className={cn(
                            'transition-colors group',
                            isConfirming && 'bg-rose-50/50 hover:bg-rose-100/50',
                          )}
                        >
                          <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5 text-primary shrink-0 opacity-70" />
                              <span>{role.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] text-[10px] text-muted-foreground italic leading-relaxed">
                            {role.description}
                          </TableCell>
                          <TableCell className="text-right pr-6 whitespace-nowrap">
                            {isConfirming ? (
                              <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="h-7 text-[9px] font-black uppercase text-muted-foreground"
                                  disabled={isSubmitting}
                                >
                                  <Undo2 className="h-3 w-3 mr-1" /> Abort
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleDelete(role)}
                                  className="h-7 text-[9px] font-black uppercase bg-destructive text-white"
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  )}{' '}
                                  Confirm
                                </Button>
                              </div>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-[9px] font-black uppercase">
                                    Registry Controls
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem onSelect={() => setEditingRole(role)} className="text-xs font-bold">
                                    <Edit className="h-3.5 w-3.5 mr-2" /> Modify Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive font-bold"
                                    onSelect={() => setConfirmDeleteId(role.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Role
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
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-52 text-center p-4">
                <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold text-muted-foreground">No roles found</p>
                {searchTerm && (
                  <p className="text-[11px] text-muted-foreground/70 mt-1">No role matches &quot;{searchTerm}&quot;.</p>
                )}
                {searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="mt-3 h-7 text-[10px] font-bold"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-3 px-6">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-primary opacity-40 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                Roles defined here appear in the dropdown during user registration and profile management.
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>

      <EditRoleDialog
        role={editingRole}
        isOpen={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
      />
    </>
  );
}
