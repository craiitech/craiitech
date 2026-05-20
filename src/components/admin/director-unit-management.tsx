'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Search, MoreHorizontal, Tags, Undo2, CheckCircle2, UserX } from 'lucide-react';
import type { Unit, UnitCategory } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { requireClaims } from '@/lib/require-claims';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';


const newUnitSchema = z.object({
  name: z.string().min(3, 'Unit name must be at least 3 characters.'),
  category: z.enum(['Academic', 'Administrative', 'Research', 'Support']),
});

const categoryColors: Record<string, string> = {
    'Academic': 'bg-blue-100 text-blue-700 border-blue-200',
    'Administrative': 'bg-slate-100 text-slate-700 border-slate-200',
    'Research': 'bg-purple-100 text-purple-700 border-purple-200',
    'Support': 'bg-amber-100 text-amber-700 border-amber-200',
};

export function DirectorUnitManagement() {
  const { userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const allUnitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

  const { unitsInCampus, availableUnits } = useMemo(() => {
    if (!allUnits || !userProfile?.campusId) {
      return { unitsInCampus: [], availableUnits: [] };
    }
    
    const directorCampusId = userProfile.campusId;

    const unitsInCampus = allUnits.filter((unit) => 
        unit.campusIds?.includes(directorCampusId)
    );
    
    // Available units are those NOT in the director's campus and matching the search term
    const availableUnits = allUnits.filter(unit => 
        !unit.campusIds?.includes(directorCampusId) &&
        unit.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return { unitsInCampus, availableUnits };
  }, [allUnits, userProfile, searchTerm]);
  

  const form = useForm<z.infer<typeof newUnitSchema>>({
    resolver: zodResolver(newUnitSchema),
    defaultValues: { name: '', category: 'Administrative' },
  });

  const isLoading = isLoadingUnits;

  const handleAddUnitToCampus = async (unit: Unit) => {
    if (!firestore || !userProfile?.campusId) {
      toast({
        title: 'Error',
        description: 'Your campus information is not available.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      await requireClaims({ role: ['Campus Director'], campusId: true });
      
      const unitRef = doc(firestore, 'units', unit.id);
      const updateData = { campusIds: arrayUnion(userProfile.campusId) };
      
      await updateDoc(unitRef, updateData);
      toast({
        title: 'Unit Assigned',
        description: `"${unit.name}" has been added to your campus.`,
      });
    } catch (error) {
      console.error('Error assigning unit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not assign unit.';
      toast({
          title: "Operation Failed",
          description: errorMessage,
          variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUnitFromCampus = async (unit: Unit) => {
    if (!firestore || !unit || !userProfile?.campusId) {
      return;
    }
    setIsSubmitting(true);

    try {
      await requireClaims({ role: ['Campus Director'], campusId: true });

      const unitRef = doc(firestore, 'units', unit.id);
      const updateData = { campusIds: arrayRemove(userProfile.campusId) }; 

      await updateDoc(unitRef, updateData);
      toast({
        title: 'Unit Unassigned',
        description: `"${unit.name}" has been removed from your campus.`,
      });
      setConfirmRemoveId(null);
    } catch (error) {
      console.error('Error removing unit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not unassign unit.';
       toast({
          title: "Operation Failed",
          description: errorMessage,
          variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCreateNewUnit = async (values: z.infer<typeof newUnitSchema>) => {
    if (!firestore || !userProfile?.campusId) {
        toast({
            title: 'Error',
            description: 'Your campus information is not available.',
            variant: 'destructive',
        });
        return;
    }

    setIsSubmitting(true);
    
    try {
      await requireClaims({ role: ['Campus Director'], campusId: true });
      
      const newUnitData = {
          name: values.name,
          category: values.category,
          campusIds: [userProfile.campusId], // Assign to current campus on creation
          createdAt: serverTimestamp(),
      };

      const unitsCollection = collection(firestore, 'units');
      await addDoc(unitsCollection, newUnitData);
      toast({
          title: 'Unit Created',
          description: `The unit "${values.name}" has been created and assigned to your campus.`
      });
      form.reset();

    } catch (error) {
       console.error('Error creating new unit:', error);
       const errorMessage = error instanceof Error ? error.message : 'Could not create new unit.';
       toast({
          title: "Operation Failed",
          description: errorMessage,
          variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unit: Unit) => {
    if (!firestore || !unit) return;
    setIsSubmitting(true);
    try {
        await requireClaims({ role: ['Campus Director'], campusId: true });
        await deleteDoc(doc(firestore, 'units', unit.id));
        toast({ title: 'Success', description: 'Unit deleted successfully.' });
        setConfirmDeleteId(null);
    } catch(error) {
        console.error("Error deleting unit:", error);
        const errorMessage = error instanceof Error ? error.message : 'Could not delete unit.';
         toast({
            title: "Operation Failed",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }


  if (userRole !== 'Campus Director') {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Permission Denied</CardTitle>
                <CardDescription>Only Campus Directors can manage units for their campus.</CardDescription>
            </CardHeader>
         </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Units in Your Campus</CardTitle>
          <CardDescription>A list of all units currently assigned to your campus.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Name</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Category</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitsInCampus.map((unit) => {
                    const isConfirmingDelete = confirmDeleteId === unit.id;
                    const isConfirmingRemove = confirmRemoveId === unit.id;
                    const isConfirming = isConfirmingDelete || isConfirmingRemove;

                    return (
                    <TableRow key={unit.id} className={cn("transition-colors", isConfirming && "bg-rose-50/50 hover:bg-rose-100/50")}>
                      <TableCell className="text-xs font-medium">{unit.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[9px] uppercase font-bold", categoryColors[unit.category || 'Administrative'])}>
                            {unit.category || 'Administrative'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {isConfirming ? (
                            <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                 <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => { setConfirmDeleteId(null); setConfirmRemoveId(null); }}
                                    className="h-8 text-[10px] font-black uppercase text-muted-foreground hover:bg-slate-200"
                                    disabled={isSubmitting}
                                >
                                    <Undo2 className="h-3 w-3 mr-1" />
                                    Abort
                                </Button>
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => isConfirmingDelete ? handleDeleteUnit(unit) : handleRemoveUnitFromCampus(unit)}
                                    className="h-8 text-[10px] font-black uppercase bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                    {isConfirmingDelete ? 'Delete?' : 'Unassign?'}
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
                              <DropdownMenuLabel className="text-[10px] font-black uppercase">Campus Controls</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setConfirmRemoveId(unit.id); }}>
                                <UserX className="mr-2 h-4 w-4" />
                                Unassign from Campus
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => { e.preventDefault(); setConfirmDeleteId(unit.id); }}
                                className="text-destructive font-bold"
                                disabled={(unit.campusIds?.length ?? 0) > 1}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Unit Permanently
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
            {!isLoading && unitsInCampus.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                No units have been assigned to your campus yet.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Units</CardTitle>
          <CardDescription>Assign an existing system unit or create a new unit unique to your campus.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="add-existing">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add-existing">Add Existing Unit</TabsTrigger>
              <TabsTrigger value="create-new">Create New Unit</TabsTrigger>
            </TabsList>
            <TabsContent value="add-existing" className="pt-4 space-y-4">
               <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search available units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-80">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Available University Units</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableUnits.map((unit) => {
                        return (
                            <TableRow key={unit.id}>
                              <TableCell className="text-xs">{unit.name}</TableCell>
                              <TableCell className="text-right pr-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddUnitToCampus(unit)}
                                    disabled={isSubmitting}
                                    className="h-7 text-[10px] font-black uppercase"
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <PlusCircle className="mr-2 h-3 w-3 mr-1" />}
                                    Assign
                                </Button>
                              </TableCell>
                            </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
                {!isLoading && availableUnits.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                     {searchTerm ? 'No available units match your search.' : 'No available units to add.'}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="create-new">
               <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateNewUnit)} className="space-y-6 pt-4">
                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Unit Name</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Institute of Marine Sciences" {...field} />
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
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create and Add Unit
                    </Button>
                  </form>
                </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
