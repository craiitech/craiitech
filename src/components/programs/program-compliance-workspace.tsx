
'use client';

import { useState, useEffect, useRef } from 'react';
import type { AcademicProgram, ProgramComplianceRecord } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Save, FileCheck, Users, BookOpen, BarChart3, ShieldCheck, Presentation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChedComplianceModule } from './modules/ched-compliance-module';
import { AccreditationModule } from './modules/accreditation-module';
import { FacultyModule } from './modules/faculty-module';
import { CurriculumModule } from './modules/curriculum-module';
import { OutcomesModule } from './modules/outcomes-module';
import { ProgramPerformanceView } from './program-performance-view';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const complianceSchema = z.record(z.any());

function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date || (obj && typeof obj.toDate === 'function')) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) sanitized[key] = sanitizeForFirestore(value);
  return sanitized;
}

const emptyEnrollment = { male: 0, female: 0, total: 0, specialNeeds: 0 };
const emptyYearLevelEnrollment = { 
    firstYear: { ...emptyEnrollment }, 
    secondYear: { ...emptyEnrollment }, 
    thirdYear: { ...emptyEnrollment }, 
    fourthYear: { ...emptyEnrollment } 
};
const emptyLeadership = { name: '', academicRank: '', highestEducation: '', isAlignedWithCMO: 'Aligned' as const, sex: 'Female' as const };

interface ProgramComplianceWorkspaceProps {
    program: AcademicProgram;
    campusId: string;
}

export function ProgramComplianceWorkspace({ program, campusId }: ProgramComplianceWorkspaceProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedAY, setSelectedAY] = useState<number>(new Date().getFullYear());
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("performance");

  const canEdit = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO' || (userProfile?.campusId === campusId && (userRole?.toLowerCase().includes('coordinator') || userRole?.toLowerCase().includes('odimo')));

  const compliancesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'programCompliances'), where('programId', '==', program.id), where('academicYear', '==', selectedAY)) : null),
    [firestore, program.id, selectedAY]
  );
  const { data: records, isLoading: isLoadingRecords } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const activeRecord = records?.[0] || null;

  const methods = useForm<any>({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      academicYear: selectedAY,
      ched: { 
        copcStatus: 'In Progress', 
        copcLink: '', 
        boardApprovalMode: 'sole',
        boardApprovalLink: '', 
        majorBoardApprovals: [],
        programCmoLink: '', 
        rqatVisits: [] 
      },
      accreditationRecords: [],
      curriculumRecords: [],
      faculty: { hasAssociateDean: false, dean: { ...emptyLeadership }, associateDean: { ...emptyLeadership }, programChair: { ...emptyLeadership }, members: [] },
      stats: { enrollment: { firstSemester: { ...emptyYearLevelEnrollment }, secondSemester: { ...emptyYearLevelEnrollment }, midYearTerm: { ...emptyYearLevelEnrollment } }, graduationCount: 0 },
      graduationRecords: [], tracerRecords: [], boardPerformance: []
    },
  });

  const lastResetId = useRef<string | null>(null);

  useEffect(() => {
    const currentId = activeRecord ? `${activeRecord.id}-${selectedAY}` : `null-${selectedAY}`;
    if (currentId === lastResetId.current) return;

    if (activeRecord) {
      methods.reset({ 
        ...activeRecord, 
        academicYear: selectedAY,
        curriculumRecords: activeRecord.curriculumRecords || [] 
      });
    } else {
      methods.reset({
        academicYear: selectedAY,
        ched: { 
            copcStatus: 'In Progress', 
            copcLink: '', 
            boardApprovalMode: 'sole',
            boardApprovalLink: '', 
            majorBoardApprovals: [],
            programCmoLink: '', 
            rqatVisits: [] 
        },
        accreditationRecords: [],
        curriculumRecords: [],
        faculty: { hasAssociateDean: false, dean: { ...emptyLeadership }, associateDean: { ...emptyLeadership }, programChair: { ...emptyLeadership }, members: [] },
        stats: { enrollment: { firstSemester: { ...emptyYearLevelEnrollment }, secondSemester: { ...emptyYearLevelEnrollment }, midYearTerm: { ...emptyYearLevelEnrollment } }, graduationCount: 0 },
        graduationRecords: [], tracerRecords: [], boardPerformance: []
      });
    }
    lastResetId.current = currentId;
  }, [activeRecord, selectedAY, methods]);

  const onSave = async (values: any) => {
    if (!firestore || !userProfile) return;
    setIsSaving(true);

    const recordId = activeRecord?.id || `${program.id}-${selectedAY}`;
    const docRef = doc(firestore, 'programCompliances', recordId);
    
    // Explicitly sync major IDs if per-major mode is used
    if (values.ched?.boardApprovalMode === 'per-major' && program.specializations) {
        values.ched.majorBoardApprovals = values.ched.majorBoardApprovals?.map((a: any, idx: number) => ({
            ...a,
            majorId: program.specializations![idx]?.id
        })) || [];
    }

    const sanitizedData = sanitizeForFirestore({ ...values, academicYear: selectedAY, programId: program.id, campusId });

    try {
      await setDoc(docRef, { ...sanitizedData, id: recordId, updatedAt: serverTimestamp(), updatedBy: userProfile.id }, { merge: true });
      toast({ title: 'Compliance Updated', description: `Record for AY ${selectedAY} has been saved.` });
    } catch (error) {
      toast({ title: 'Save Failed', description: 'Could not update record.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const academicYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSave)} className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border border-primary/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider">Academic Monitoring System</span>
            <Select value={String(selectedAY)} onValueChange={(v) => setSelectedAY(Number(v))}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Academic Year" /></SelectTrigger>
              <SelectContent>{academicYears.map(year => <SelectItem key={year} value={String(year)}>AY {year}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {!canEdit && <Badge variant="outline" className="h-9 px-4 text-xs font-medium bg-background">Read-Only</Badge>}
            {canEdit && (
              <Button type="submit" disabled={isSaving} className="shadow-lg shadow-primary/20">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Compliance Record
              </Button>
            )}
          </div>
        </div>

        {isLoadingRecords ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-6">
              <TabsTrigger value="performance" className="py-2"><Presentation className="mr-2 h-4 w-4" /> Performance</TabsTrigger>
              <TabsTrigger value="ched" className="py-2"><FileCheck className="mr-2 h-4 w-4" /> CHED & RQAT</TabsTrigger>
              <TabsTrigger value="accreditation" className="py-2"><ShieldCheck className="mr-2 h-4 w-4" /> Accreditation</TabsTrigger>
              <TabsTrigger value="faculty" className="py-2"><Users className="mr-2 h-4 w-4" /> Faculty</TabsTrigger>
              <TabsTrigger value="curriculum" className="py-2"><BookOpen className="mr-2 h-4 w-4" /> Curriculum</TabsTrigger>
              <TabsTrigger value="outcomes" className="py-2"><BarChart3 className="mr-2 h-4 w-4" /> Outcomes</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="performance">
                <ProgramPerformanceView 
                    program={program} 
                    record={activeRecord} 
                    selectedYear={selectedAY} 
                    onResolveDeficiency={(tab) => setActiveTab(tab)}
                />
              </TabsContent>
              <TabsContent value="ched"><ChedComplianceModule canEdit={canEdit} program={program} /></TabsContent>
              <TabsContent value="accreditation"><AccreditationModule canEdit={canEdit} programSpecializations={program.specializations} /></TabsContent>
              <TabsContent value="faculty"><FacultyModule canEdit={canEdit} program={program} /></TabsContent>
              <TabsContent value="curriculum"><CurriculumModule canEdit={canEdit} programSpecializations={program.specializations} /></TabsContent>
              <TabsContent value="outcomes"><OutcomesModule canEdit={canEdit} isBoardProgram={program.isBoardProgram} /></TabsContent>
            </div>
          </Tabs>
        )}
      </form>
    </FormProvider>
  );
}
