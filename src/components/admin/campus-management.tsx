'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ArrowUpDown, X, Building2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Campus } from '@/lib/types';

const campusSchema = z.object({
  name: z.string().min(3, 'Campus name must be at least 3 characters.'),
  location: z.string().min(3, 'Location must be at least 3 characters.'),
});

type SortConfig = {
  key: 'name' | 'location';
  direction: 'ascending' | 'descending';
} | null;

export function CampusManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const firestore = useFirestore();
  const { toast } = useToast();

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading } = useCollection<Campus>(campusesQuery);

  const form = useForm<z.infer<typeof campusSchema>>({
    resolver: zodResolver(campusSchema),
    defaultValues: { name: '', location: '' },
  });

  const onSubmit = async (values: z.infer<typeof campusSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'campuses'), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'New campus created.' });
      form.reset();
    } catch (error) {
      console.error('Error creating campus:', error);
      toast({
        title: 'Error',
        description: 'Could not create campus.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestSort = (key: 'name' | 'location') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedCampuses = useMemo(() => {
    if (!campuses) return [];
    let list = [...campuses];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.location && c.location.toLowerCase().includes(q)),
      );
    }

    if (sortConfig) {
      list.sort((a, b) => {
        const valA = (a[sortConfig.key] || '').toLowerCase();
        const valB = (b[sortConfig.key] || '').toLowerCase();
        return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return list;
  }, [campuses, searchTerm, sortConfig]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-primary/5 border-b py-6">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Building2 className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Provisioning</span>
          </div>
          <CardTitle>Add New Campus</CardTitle>
          <CardDescription>Create a new campus site to be used across the university system.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pt-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Campus Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Campus" {...field} className="h-10 font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Location / Municipality</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Odiongan, Romblon" {...field} className="h-10 text-xs" />
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Campus'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/30 border-b py-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">Existing Campuses</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                List of all registered university campus sites.
              </CardDescription>
            </div>
            {campuses && (
              <Badge variant="outline" className="h-6 text-[10px] font-black uppercase px-2 w-fit">
                {filteredAndSortedCampuses.length} of {campuses.length} Campuses
              </Badge>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search campuses by name or location..."
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
          ) : filteredAndSortedCampuses.length > 0 ? (
            <ScrollArea className="h-[380px]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 text-[10px] font-black uppercase tracking-wider hover:bg-transparent"
                        onClick={() => requestSort('name')}
                      >
                        Campus Name
                        <ArrowUpDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase pr-6 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 text-[10px] font-black uppercase tracking-wider hover:bg-transparent"
                        onClick={() => requestSort('location')}
                      >
                        Location
                        <ArrowUpDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCampuses.map((campus) => (
                    <TableRow key={campus.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary shrink-0 opacity-70" />
                          <span>{campus.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-xs text-muted-foreground py-3.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                          <span>{campus.location}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-center p-4">
              <Building2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-bold text-muted-foreground">No campuses found</p>
              {searchTerm && (
                <p className="text-[11px] text-muted-foreground/70 mt-1">No campus matches &quot;{searchTerm}&quot;.</p>
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
      </Card>
    </div>
  );
}
