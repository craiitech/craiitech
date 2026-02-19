'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Unit, Campus, UnitCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, School, Building, LayoutGrid, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories: UnitCategory[] = ['Academic', 'Administrative', 'Research', 'Support'];

const categoryColors: Record<UnitCategory, string> = {
    'Academic': 'bg-blue-50 text-blue-700 border-blue-200',
    'Administrative': 'bg-slate-50 text-slate-700 border-slate-200',
    'Research': 'bg-purple-50 text-purple-700 border-purple-200',
    'Support': 'bg-amber-50 text-amber-700 border-amber-200',
};

export function UnitGroupingExplorer() {
  const firestore = useFirestore();

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const explorerData = useMemo(() => {
    if (!units || !campuses) return [];

    return categories.map(category => {
        const categoryUnits = units.filter(u => u.category === category);
        
        const campusBreakdown = campuses.map(campus => ({
            campus,
            units: categoryUnits.filter(u => u.campusIds?.includes(campus.id)).sort((a,b) => a.name.localeCompare(b.name))
        })).filter(c => c.units.length > 0);

        return {
            category,
            campusBreakdown,
            totalInCategory: categoryUnits.length
        };
    }).filter(cat => cat.totalInCategory > 0);
  }, [units, campuses]);

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
            <CardTitle className="text-lg font-black uppercase tracking-tight">Unit Registry Explorer</CardTitle>
            <CardDescription className="text-xs">Verify the grouping of academic and administrative units across the university sites to facilitate easier audit planning.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {explorerData.map((catData) => (
            <Card key={catData.category} className="shadow-md overflow-hidden border-primary/10">
                <CardHeader className={cn("border-b py-4", categoryColors[catData.category])}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <LayoutGrid className="h-5 w-5" />
                            <CardTitle className="text-sm font-black uppercase tracking-widest">{catData.category} Units</CardTitle>
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
                                            <span className="font-black text-xs uppercase text-slate-700">{breakdown.campus.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {breakdown.units.map(unit => (
                                                <Badge 
                                                    key={unit.id} 
                                                    variant="outline" 
                                                    className="bg-white border-slate-200 text-slate-600 font-bold text-[10px] h-7 px-3 flex items-center gap-2 shadow-sm hover:border-primary/40 transition-colors"
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
    </div>
  );
}
