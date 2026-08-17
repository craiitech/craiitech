'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, ArrowUpDown, Search, Undo2, CheckCircle2, Trash2, Building2 } from 'lucide-react';
import type { Unit, Campus } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditUnitDialog } from './edit-unit-dialog';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(3, 'Unit name must be at least 3 characters.'),
  category: z.enum(['Academic', 'Administrative', 'Research', 'Support']),
  campusId: z.string().min(1, 'Please select a campus for the unit.'),
  vicePresidentId: z.string().optional(),
});

type UnitFormValues = z.infer<typeof formSchema>;
type SortConfig = {
  key: 'name' | 'campusNames' | 'category' | 'supervisingOffice';
  direction: 'ascending' | 'descending';
} | null;

const categoryColors: Record<string, string> = {
  Academic: 'bg-blue-100 text-blue-700 border-blue-200',
  Administrative:
    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  Research: 'bg-purple-100 text-purple-700 border-purple-200',
  Support: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function AdminUnitManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVpFilter, setSelectedVpFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });

  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

  const allCampusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(allCampusesQuery);

  const campusMap = useMemo(() => {
    if (!allCampuses) return new Map<string, string>();
    return new Map(allCampuses.map((c) => [c.id, c.name]));
  }, [allCampuses]);

  const unitsMap = useMemo(() => {
    if (!allUnits) return new Map<string, string>();
    return new Map(allUnits.map((u) => [u.id, u.name]));
  }, [allUnits]);

  const vpUnitOptions = useMemo(() => {
    if (!allUnits) return [];
    const assignedVpIds = new Set(allUnits.map((u) => u.vicePresidentId).filter(Boolean) as string[]);
    return allUnits
      .filter((u) => {
        const name = u.name.toLowerCase();
        const isExecutive =
          name.includes('vice president') ||
          name.includes('president') ||
          name.includes('chancellor') ||
          name.includes('ovp');
        return isExecutive || assignedVpIds.has(u.id);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUnits]);

  const isLoading = isLoadingUnits || isLoadingCampuses;

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', campusId: '', category: 'Administrative', vicePresidentId: 'none' },
  });

  const getCampusNamesString = (campusIds: string[] | undefined) => {
    if (!campusIds || campusIds.length === 0) return 'Unassigned';
    return campusIds.map((id) => campusMap.get(id) || 'Unknown').join(', ');
  };

  const getVpName = (vicePresidentId?: string) => {
    if (!vicePresidentId) return 'Unassigned';
    return unitsMap.get(vicePresidentId) || 'Unknown Office';
  };

  const filteredAndSortedUnits = useMemo(() => {
    if (!allUnits) return [];

    let filtered = [...allUnits];

    // Filter by Supervising Office / Vice President
    if (selectedVpFilter !== 'all') {
      if (selectedVpFilter === 'unassigned') {
        filtered = filtered.filter((unit) => !unit.vicePresidentId);
      } else {
        filtered = filtered.filter((unit) => unit.vicePresidentId === selectedVpFilter);
      }
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (unit) =>
          unit.name.toLowerCase().includes(lowercasedFilter) ||
          getCampusNamesString(unit.campusIds).toLowerCase().includes(lowercasedFilter) ||
          (unit.category || '').toLowerCase().includes(lowercasedFilter) ||
          getVpName(unit.vicePresidentId).toLowerCase().includes(lowercasedFilter),
      );
    }

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        if (sortConfig.key === 'campusNames') {
          aValue = getCampusNamesString(a.campusIds);
          bValue = getCampusNamesString(b.campusIds);
        } else if (sortConfig.key === 'supervisingOffice') {
          aValue = getVpName(a.vicePresidentId);
          bValue = getVpName(b.vicePresidentId);
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allUnits, searchTerm, selectedVpFilter, sortConfig, campusMap, unitsMap]);

  const requestSort = (key: 'name' | 'campusNames' | 'category' | 'supervisingOffice') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: 'name' | 'campusNames' | 'category' | 'supervisingOffice') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const onSubmit = async (values: UnitFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const newUnitData: any = {
      name: values.name,
      category: values.category,
      createdAt: serverTimestamp(),
      campusIds: [values.campusId],
    };

    if (values.vicePresidentId && values.vicePresidentId !== 'none') {
      newUnitData.vicePresidentId = values.vicePresidentId;
    }

    const unitsCollectionRef = collection(firestore, 'units');

    addDoc(unitsCollectionRef, newUnitData)
      .then(() => {
        toast({ title: 'Success', description: 'New unit created.' });
        form.reset({ name: '', campusId: '', category: 'Administrative', vicePresidentId: 'none' });
      })
      .catch((error) => {
        console.error('Error creating unit:', error);
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: unitsCollectionRef.path,
            operation: 'create',
            requestResourceData: newUnitData,
          }),
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleDeleteUnit = async (unit: Unit) => {
    if (!firestore || !unit) return;
    setIsSubmitting(true);
    const unitRef = doc(firestore, 'units', unit.id);
    try {
      await deleteDoc(unitRef);
      toast({
        title: 'Unit Deleted',
        description: `The unit "${unit.name}" has been permanently removed.`,
      });
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast({
        title: 'Error',
        description: 'Could not delete unit.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-4 h-fit">
          <CardHeader>
            <CardTitle>Add New Unit</CardTitle>
            <CardDescription>
              Create a new official system unit and assign it to an initial campus and supervising office.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., College of Engineering" {...field} value={field.value ?? ''} />
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
                        <SelectContent>
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
                  name="campusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Initial Campus</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allCampuses?.map((campus) => (
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
                <FormField
                  control={form.control}
                  name="vicePresidentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervising Office (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Assign supervising office" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None (Direct / Self-governing)</SelectItem>
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
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Unit
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>All System Units</span>
                  <Badge variant="secondary" className="text-xs font-bold font-mono">
                    {filteredAndSortedUnits.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  A list of all units, their supervising offices, and campus assignments.
                </CardDescription>
              </div>
              {(selectedVpFilter !== 'all' || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedVpFilter('all');
                    setSearchTerm('');
                  }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1" />
                  Reset filters
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by unit name, supervising office, or campus..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full h-9 text-xs"
                />
              </div>
              <div className="w-full sm:w-[280px]">
                <Select value={selectedVpFilter} onValueChange={setSelectedVpFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Supervising Offices" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Supervising Offices
                    </SelectItem>
                    <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                      Unassigned / Direct Only
                    </SelectItem>
                    {vpUnitOptions.map((vp) => (
                      <SelectItem key={vp.id} value={vp.id} className="text-xs">
                        {vp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort('name')}
                          className="-ml-4 text-[10px] font-black uppercase"
                        >
                          Name {getSortIndicator('name')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort('supervisingOffice')}
                          className="-ml-4 text-[10px] font-black uppercase"
                        >
                          Supervising Office {getSortIndicator('supervisingOffice')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort('category')}
                          className="-ml-4 text-[10px] font-black uppercase"
                        >
                          Category {getSortIndicator('category')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort('campusNames')}
                          className="-ml-4 text-[10px] font-black uppercase"
                        >
                          Campuses {getSortIndicator('campusNames')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUnits.map((unit) => {
                      const isConfirming = confirmDeleteId === unit.id;
                      const vpName = unit.vicePresidentId ? unitsMap.get(unit.vicePresidentId) : null;
                      return (
                        <TableRow
                          key={unit.id}
                          className={cn('transition-colors', isConfirming && 'bg-rose-50/50 hover:bg-rose-100/50')}
                        >
                          <TableCell className="font-medium text-xs max-w-[200px]">{unit.name}</TableCell>
                          <TableCell className="text-xs">
                            {vpName ? (
                              <div className="flex items-center gap-1.5" title={vpName}>
                                <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                  {vpName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] uppercase font-bold',
                                categoryColors[unit.category || 'Administrative'],
                              )}
                            >
                              {unit.category || 'Administrative'}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="text-[10px] text-muted-foreground max-w-[150px] truncate"
                            title={getCampusNamesString(unit.campusIds)}
                          >
                            {getCampusNamesString(unit.campusIds)}
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
                                  onClick={() => handleDeleteUnit(unit)}
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
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel className="text-[10px] font-black uppercase">
                                    Unit Controls
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setTimeout(() => setEditingUnit(unit), 0);
                                    }}
                                  >
                                    Edit Unit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive font-bold"
                                    onSelect={() => {
                                      setTimeout(() => setConfirmDeleteId(unit.id), 0);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Unit
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
              </div>
            )}
            {!isLoading && filteredAndSortedUnits?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">No units found.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditUnitDialog
        unit={editingUnit}
        allCampuses={allCampuses || []}
        isOpen={!!editingUnit}
        onOpenChange={(open) => !open && setEditingUnit(null)}
      />
    </>
  );
}
