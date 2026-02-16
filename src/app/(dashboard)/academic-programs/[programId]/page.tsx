
'use client';

import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { AcademicProgram, Campus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GraduationCap, Loader2 } from 'lucide-react';
import { ProgramComplianceWorkspace } from '@/components/programs/program-compliance-workspace';

export default function ProgramMonitoringDetailPage() {
  const { programId } = useParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const programRef = useMemoFirebase(
    () => (firestore && user && programId ? doc(firestore, 'academicPrograms', programId as string) : null),
    [firestore, user, programId]
  );
  const { data: program, isLoading: isLoadingProgram } = useDoc<AcademicProgram>(programRef);

  const campusRef = useMemoFirebase(
    () => (firestore && user && program?.campusId ? doc(firestore, 'campuses', program.campusId) : null),
    [firestore, user, program?.campusId]
  );
  const { data: campus } = useDoc<Campus>(campusRef);

  const isLoading = isUserLoading || isLoadingProgram;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Program Not Found</h2>
        <p className="text-muted-foreground mt-2">The academic program you are looking for does not exist.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/academic-programs')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/academic-programs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">{program.name}</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {program.abbreviation} &bull; {campus?.name || '...'} &bull; {program.level} Registry
            </p>
          </div>
        </div>
      </div>

      <ProgramComplianceWorkspace 
        program={program} 
        campusId={program.campusId} 
      />
    </div>
  );
}
