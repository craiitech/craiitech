'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from '@/firebase/firestore-wrapper';
import type { Unit, Campus, UnitCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, School, Building, LayoutGrid, Info, Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories: UnitCategory[] = ['Academic', 'Administrative', 'Research', 'Support'];

const categoryColors: Record<UnitCategory, string> = {
  Academic: 'bg-blue-50 text-blue-700 border-blue-200',
  Administrative:
    'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  Research: 'bg-purple-50 text-purple-700 border-purple-200',
  Support: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function UnitGroupingExplorer() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const explorerData = useMemo(() => {
    if (!units || !campuses) return [];

    const activeCategories =
      selectedCategory === 'all'
        ? categories
        : categories.filter((c) => c.toLowerCase() === selectedCategory.toLowerCase());

    const query = searchTerm.toLowerCase().trim();

    return activeCategories
      .map((category) => {
        let categoryUnits = units.filter((u) => u.category === category);

        if (query) {
          categoryUnits = categoryUnits.filter((u) => {
            const matchesUnitName = u.name.toLowerCase().includes(query);
            const matchesCampus = campuses.some(
              (c) => u.campusIds?.includes(c.id) && c.name.toLowerCase().includes(query),
            );
            return matchesUnitName || matchesCampus;
          });
        }

        const relevantCampuses =
          selectedCampusId === 'all' ? campuses : campuses.filter((c) => c.id === selectedCampusId);

        const campusBreakdown = relevantCampuses
          .map((campus) => {
            let campusUnits = categoryUnits.filter((u) => u.campusIds?.includes(campus.id));

            if (query) {
              const campusNameMatches = campus.name.toLowerCase().includes(query);
              if (!campusNameMatches) {
                campusUnits = campusUnits.filter((u) => u.name.toLowerCase().includes(query));
              }
            }

            return {
              campus,
              units: campusUnits.sort((a, b) => a.name.localeCompare(b.name)),
            };
          })
          .filter((c) => c.units.length > 0);

        const totalFilteredUnits = campusBreakdown.reduce((sum, item) => sum + item.units.length, 0);

        return {
          category,
          campusBreakdown,
          totalInCategory: totalFilteredUnits,
        };
      })
      .filter((cat) => cat.totalInCategory > 0);
  }, [units, campuses, selectedCategory, selectedCampusId, searchTerm]);

  const totalVisibleUnits = useMemo(() => {
    return explorerData.reduce((acc, cat) => acc + cat.totalInCategory, 0);
  }, [explorerData]);

  const hasActiveFilters = searchTerm.trim() !== '' || selectedCategory !== 'all' || selectedCampusId !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedCampusId('all');
  };

  if (isLoadingUnits || isLoadingCampuses) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="py-4">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Info className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Institutional Oversight</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight">Unit Registry Explorer</CardTitle>
              <CardDescription className="text-xs">
                Verify the grouping of academic and administrative units across the university sites to facilitate
                easier audit planning.
              </CardDescription>
            </div>
            {units && (
              <Badge variant="outline" className="h-7 text-xs font-black uppercase px-3 bg-background/80 w-fit">
                {totalVisibleUnits} of {units.length} Units Visible
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by unit name or campus site..."
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

            <div className="w-full md:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campuses?.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="h-9 text-[10px] font-black uppercase tracking-wider shrink-0 bg-background"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {explorerData.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {explorerData.map((catData) => (
            <Card key={catData.category} className="shadow-md overflow-hidden border-primary/10">
              <CardHeader className={cn('border-b py-4', categoryColors[catData.category])}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="h-5 w-5" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest">
                      {catData.category} Units
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-white/50 border-current font-black text-[10px] h-5 px-2">
                    {catData.totalInCategory} ENTITIES
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[200px] font-bold text-[10px] uppercase pl-6">Campus Site</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Assigned Units & Offices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catData.campusBreakdown.map((breakdown) => (
                      <TableRow key={breakdown.campus.id} className="hover:bg-transparent">
                        <TableCell className="align-top py-4 pl-6">
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4 text-primary" />
                            <span className="font-black text-xs uppercase text-slate-700 dark:text-slate-300">
                              {breakdown.campus.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-wrap gap-2">
                            {breakdown.units.map((unit) => (
                              <Badge
                                key={unit.id}
                                variant="outline"
                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-[10px] h-7 px-3 flex items-center gap-2 shadow-sm hover:border-primary/40 transition-colors"
                              >
                                <Building className="h-3 w-3 opacity-40" />
                                {unit.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center justify-center space-y-3">
            <LayoutGrid className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-bold text-muted-foreground">No units found matching your search criteria.</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs font-bold">
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
