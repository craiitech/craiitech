
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { AcademicProgram, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, GraduationCap, Search, Filter } from 'lucide-react';
import { ProgramRegistry } from '@/components/programs/program-registry';
import { ProgramDialog } from '@/components/programs/program-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AcademicProgramsPage() {
  const { userProfile, isAdmin, userRole, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<AcademicProgram | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState<string>('all');

  const canManage = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO';

  const programsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'academicPrograms'), orderBy('name', 'asc')) : null),
    [firestore]
  );
  const { data: programs, isLoading: isLoadingPrograms } = useCollection<AcademicProgram>(programsQuery);

  const campusesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campuses') : null),
    [firestore]
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const handleNewProgram = () => {
    setEditingProgram(null);
    setIsDialogOpen(true);
  };

  const handleEditProgram = (program: AcademicProgram) => {
    setEditingProgram(program);
    setIsDialogOpen(true);
  };

  const filteredPrograms = programs?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampus = campusFilter === 'all' || p.campusId === campusFilter;
    return matchesSearch && matchesCampus;
  });

  const isLoading = isUserLoading || isLoadingPrograms || isLoadingCampuses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            Academic Program Monitoring
          </h2>
          <p className="text-muted-foreground">
            Manage university degree programs and monitor their ISO & CHED compliance records.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleNewProgram}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Register Program
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1 h-fit">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filters
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Program name or initials..."
                            className="pl-9 h-9 text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campus</label>
                    <Select value={campusFilter} onValueChange={setCampusFilter}>
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="All Campuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Campuses</SelectItem>
                            {campuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>

        <div className="md:col-span-3">
            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <ProgramRegistry 
                    programs={filteredPrograms || []} 
                    campuses={campuses || []}
                    onEdit={handleEditProgram}
                    canManage={canManage}
                />
            )}
        </div>
      </div>

      <ProgramDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        program={editingProgram}
        campuses={campuses || []}
      />
    </div>
  );
}
