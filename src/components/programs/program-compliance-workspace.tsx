'use client';

import { useState, useMemo, useEffect } from 'react';
import type { AcademicProgram, ProgramComplianceRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Save, FileCheck, Users, BookOpen, BarChart3, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChedComplianceModule } from './modules/ched-compliance-module';
import { AccreditationModule } from './modules/accreditation-module';
import { FacultyModule } from './modules/faculty-module';
import { CurriculumModule } from './modules/curriculum-module';
import { OutcomesModule } from './modules/outcomes-module';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface ProgramComplianceWorkspaceProps {
  program: AcademicProgram;
  campusId: string;
}

const currentYear = new Date().getFullYear();
const academicYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Validation schema for the entire compliance record
const complianceSchema = z.object({
  academicYear: z.coerce.number(),
  ched: z.object({
    copcStatus: z.enum(['With COPC', 'No COPC', 'In Progress']),
    copcLink: z.string().url().optional().or(z.literal('')),
    contentNoted: z.boolean(),
    contentNotedLink: z.string().url().optional().or(z.literal('')),
    rqatVisits: z.array(z.object({
      date: z.string().optional(),
      result: z.string().optional(),
      comments: z.string().optional(),
      nonCompliances: z.string().optional(),
    })).optional(),
  }),
  accreditation: z.object({
    level: z.string(),
    dateOfAward: z.any().optional(),
    nextSchedule: z.any().optional(),
    certificateLink: z.string().url().optional().or(z.literal('')),
  }),
  curriculum: z.object({
    revisionNumber: z.string(),
    dateImplemented: z.any().optional(),
    isNotedByChed: z.boolean(),
    cmoLink: z.string().url().optional().or(z.literal('')),
  }),
  faculty: z.object({
    dean: z.object({ name: z.string(), highestEducation: z.string(), isAlignedWithCMO: z.string() }),
    programChair: z.object({ name: z.string(), highestEducation: z.string(), isAlignedWithCMO: z.string() }),
    members: z.array(z.object({
      id: z.string(),
      name: z.string(),
      highestEducation: z.string(),
      category: z.enum(['Core', 'Professional Special', 'General Education', 'Staff']),
      isAlignedWithCMO: z.string(),
    })),
  }),
  stats: z.object({
    enrollment: z.object({
      firstYear: z.coerce.number(),
      secondYear: z.coerce.number(),
      thirdYear: z.coerce.number(),
      fourthYear: z.coerce.number(),
      fifthYear: z.coerce.number().optional(),
    }),
    graduationCount: z.coerce.number(),
  }),
  graduationRecords: z.array(z.object({
    year: z.coerce.number(),
    semester: z.string(),
    count: z.coerce.number(),
  })).optional(),
  tracerRecords: z.array(z.object({
    year: z.coerce.number(),
    semester: z.string(),
    totalGraduates: z.coerce.number(),
    tracedCount: z.coerce.number(),
    employmentRate: z.coerce.number(),
  })).optional(),
  boardPerformance: z.object({
    examDate: z.any().optional(),
    firstTakersPassRate: z.coerce.number(),
    retakersPassRate: z.coerce.number(),
    overallPassRate: z.coerce.number(),
    nationalPassingRate: z.coerce.number(),
  }).optional(),
});

/**
 * Deeply removes all undefined values from an object or array.
 * Firestore setDoc fails if any field contains an 'undefined' value.
 */
function sanitizeForFirestore(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => (v && typeof v === 'object' && !(v instanceof Date)) ? sanitizeForFirestore(v) : v);
  }
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value === undefined) return acc;
    if (value !== null && typeof value === 'object' && !(v instanceof Date)) {
      return { ...acc, [key]: sanitizeForFirestore(value) };
    }
    return { ...acc, [key]: value };
  }, {});
}

export function ProgramComplianceWorkspace({ program, campusId }: ProgramComplianceWorkspaceProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedAY, setSelectedAY] = useState<number>(currentYear);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO' || (userProfile?.campusId === campusId && (userRole?.toLowerCase().includes('coordinator') || userRole?.toLowerCase().includes('odimo')));

  const compliancesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'programCompliances'), where('programId', '==', program.id), where('academicYear', '==', selectedAY)) : null),
    [firestore, program.id, selectedAY]
  );
  const { data: records, isLoading: isLoadingRecords } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const activeRecord = records?.[0] || null;

  const methods = useForm<z.infer<typeof complianceSchema>>({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      academicYear: selectedAY,
      ched: { 
        copcStatus: 'In Progress', 
        contentNoted: false,
        copcLink: '',
        contentNotedLink: '',
        rqatVisits: []
      },
      accreditation: { 
        level: 'Not Accredited',
        certificateLink: '',
        dateOfAward: '',
        nextSchedule: ''
      },
      curriculum: { 
        revisionNumber: '0', 
        isNotedByChed: false, 
        cmoLink: '',
        dateImplemented: ''
      },
      faculty: { 
        dean: { name: '', highestEducation: '', isAlignedWithCMO: 'Aligned' },
        programChair: { name: '', highestEducation: '', isAlignedWithCMO: 'Aligned' },
        members: [] 
      },
      stats: { enrollment: { firstYear: 0, secondYear: 0, thirdYear: 0, fourthYear: 0 }, graduationCount: 0 },
      graduationRecords: [],
      tracerRecords: [],
      boardPerformance: { 
        examDate: '',
        firstTakersPassRate: 0, 
        retakersPassRate: 0, 
        overallPassRate: 0, 
        nationalPassingRate: 0 
      }
    },
  });

  // Synchronize CHED content noted and Curriculum noted fields
  useEffect(() => {
    const subscription = methods.watch((value, { name }) => {
      if (name === 'ched.contentNoted') {
        const newValue = !!value.ched?.contentNoted;
        if (methods.getValues('curriculum.isNotedByChed') !== newValue) {
          methods.setValue('curriculum.isNotedByChed', newValue, { shouldDirty: true });
        }
      } else if (name === 'curriculum.isNotedByChed') {
        const newValue = !!value.curriculum?.isNotedByChed;
        if (methods.getValues('ched.contentNoted') !== newValue) {
          methods.setValue('ched.contentNoted', newValue, { shouldDirty: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [methods]);

  useMemo(() => {
    if (activeRecord) {
      methods.reset({
        ...activeRecord,
        academicYear: selectedAY,
        graduationRecords: activeRecord.graduationRecords || [],
        tracerRecords: activeRecord.tracerRecords || [],
        ched: {
            ...activeRecord.ched,
            rqatVisits: activeRecord.ched.rqatVisits || []
        }
      });
    } else {
      methods.reset({
        academicYear: selectedAY,
        ched: { 
          copcStatus: 'In Progress', 
          contentNoted: false, 
          copcLink: '',
          contentNotedLink: '',
          rqatVisits: [] 
        },
        accreditation: { 
          level: 'Not Accredited', 
          certificateLink: '',
          dateOfAward: '',
          nextSchedule: ''
        },
        curriculum: { 
          revisionNumber: '0', 
          isNotedByChed: false, 
          cmoLink: '',
          dateImplemented: ''
        },
        faculty: { 
          dean: { name: '', highestEducation: '', isAlignedWithCMO: 'Aligned' },
          programChair: { name: '', highestEducation: '', isAlignedWithCMO: 'Aligned' },
          members: [] 
        },
        stats: { enrollment: { firstYear: 0, secondYear: 0, thirdYear: 0, fourthYear: 0 }, graduationCount: 0 },
        graduationRecords: [],
        tracerRecords: [],
        boardPerformance: { 
          examDate: '',
          firstTakersPassRate: 0, 
          retakersPassRate: 0, 
          overallPassRate: 0, 
          nationalPassingRate: 0 
        }
      });
    }
  }, [activeRecord, selectedAY, methods]);

  const onSave = async (values: z.infer<typeof complianceSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSaving(true);

    const recordId = activeRecord?.id || `${program.id}-${selectedAY}`;
    const docRef = doc(firestore, 'programCompliances', recordId);

    // Sanitize values to remove undefined fields which Firestore strictly rejects
    const sanitizedData = sanitizeForFirestore(values);

    try {
      await setDoc(docRef, {
        ...sanitizedData,
        id: recordId,
        programId: program.id,
        campusId: campusId,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile.id,
      }, { merge: true });

      toast({ title: 'Compliance Updated', description: `Record for AY ${selectedAY} has been saved successfully.` });
    } catch (error) {
      console.error('Compliance save error:', error);
      toast({ title: 'Save Failed', description: 'Could not update compliance record.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSave)} className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border border-primary/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider">Compliance Workspace</span>
            <Select value={String(selectedAY)} onValueChange={(v) => setSelectedAY(Number(v))}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year} value={String(year)}>Academic Year {year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {!canEdit && (
              <Badge variant="outline" className="h-9 px-4 text-xs font-medium bg-background">
                Read-Only Access
              </Badge>
            )}
            {canEdit && (
              <Button type="submit" disabled={isSaving} className="shadow-lg shadow-primary/20">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Compliance Record
              </Button>
            )}
          </div>
        </div>

        {isLoadingRecords ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <Tabs defaultValue="ched" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="ched" className="py-2"><FileCheck className="mr-2 h-4 w-4" /> CHED & RQAT</TabsTrigger>
              <TabsTrigger value="accreditation" className="py-2"><ShieldCheck className="mr-2 h-4 w-4" /> Accreditation</TabsTrigger>
              <TabsTrigger value="faculty" className="py-2"><Users className="mr-2 h-4 w-4" /> Faculty</TabsTrigger>
              <TabsTrigger value="curriculum" className="py-2"><BookOpen className="mr-2 h-4 w-4" /> Curriculum</TabsTrigger>
              <TabsTrigger value="outcomes" className="py-2"><BarChart3 className="mr-2 h-4 w-4" /> Outcomes</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="ched"><ChedComplianceModule canEdit={canEdit} /></TabsContent>
              <TabsContent value="accreditation"><AccreditationModule canEdit={canEdit} /></TabsContent>
              <TabsContent value="faculty"><FacultyModule canEdit={canEdit} /></TabsContent>
              <TabsContent value="curriculum"><CurriculumModule canEdit={canEdit} /></TabsContent>
              <TabsContent value="outcomes"><OutcomesModule canEdit={canEdit} isBoardProgram={program.isBoardProgram} /></TabsContent>
            </div>
          </Tabs>
        )}
      </form>
    </FormProvider>
  );
}
