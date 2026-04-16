'use client';

/**
 * @fileOverview A focused dialog for batch entry of specific program metrics.
 */

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Info, Users, GraduationCap, TrendingUp, BarChart3, ChevronRight, Calculator, CheckCircle2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { AcademicProgram, ProgramComplianceRecord } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurriculumModule } from './modules/curriculum-module';
import { OutcomesModule } from './modules/outcomes-module';
import { Badge } from '@/components/ui/badge';

interface BatchEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  program: AcademicProgram | null;
  mode: 'enrollment' | 'graduation' | 'board' | 'tracer';
  selectedYear: number;
}

const complianceSchema = z.record(z.any());

export function BatchEntryDialog({ isOpen, onOpenChange, program, mode, selectedYear }: BatchEntryDialogProps) {
  const { userProfile, firestore } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const recordId = program ? `${program.id}-${selectedYear}` : 'null';
  const recordRef = useMemoFirebase(
    () => (firestore && program ? doc(firestore, 'programCompliances', recordId) : null),
    [firestore, recordId]
  );
  const { data: record, isLoading } = useDoc<ProgramComplianceRecord>(recordRef);

  const methods = useForm<any>({
    resolver: zodResolver(complianceSchema),
  });

  useEffect(() => {
    if (isOpen) {
        if (record) {
            methods.reset(record);
        } else {
            // Default scaffolding if no record exists for the year
            methods.reset({
                academicYear: selectedYear,
                programId: program?.id,
                campusId: program?.campusId,
                stats: { 
                    enrollment: { 
                        firstSemester: { firstYear: { total: 0 }, secondYear: { total: 0 }, thirdYear: { total: 0 }, fourthYear: { total: 0 } },
                        secondSemester: { firstYear: { total: 0 }, secondYear: { total: 0 }, thirdYear: { total: 0 }, fourthYear: { total: 0 } },
                        midYearTerm: { firstYear: { total: 0 }, secondYear: { total: 0 }, thirdYear: { total: 0 }, fourthYear: { total: 0 } }
                    } 
                },
                graduationRecords: [],
                boardPerformance: [],
                tracerRecords: [],
                curriculumRecords: [],
                enrollmentRecords: []
            });
        }
    }
  }, [record, isOpen, program, selectedYear, methods]);

  const onSave = async (values: any) => {
    if (!firestore || !userProfile || !program) return;
    setIsSaving(true);

    try {
      await setDoc(doc(firestore, 'programCompliances', recordId), {
        ...values,
        id: recordId,
        academicYear: selectedYear,
        programId: program.id,
        campusId: program.campusId,
        unitId: program.collegeId,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile.id,
      }, { merge: true });
      
      toast({ title: 'Record Updated', description: `Successfully logged ${mode} data.` });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary mb-1">
                    {mode === 'enrollment' && <Users className="h-5 w-5" />}
                    {mode === 'graduation' && <GraduationCap className="h-5 w-5" />}
                    {mode === 'board' && <TrendingUp className="h-5 w-5" />}
                    {mode === 'tracer' && <BarChart3 className="h-5 w-5" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">Rapid Hub Entry: {mode}</span>
                </div>
                <DialogTitle className="text-xl font-bold">{program?.name}</DialogTitle>
            </div>
            <Badge variant="outline" className="h-6 font-black bg-white border-primary/20 text-primary">AY {selectedYear}</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-white">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Priming Registry...</p>
                </div>
            ) : (
                <FormProvider {...methods}>
                    <form id="batch-form" onSubmit={methods.handleSubmit(onSave)} className="h-full flex flex-col">
                        <ScrollArea className="flex-1">
                            <div className="p-8 pb-20">
                                {mode === 'enrollment' && (
                                    <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                                        <CurriculumModule canEdit={true} programSpecializations={program?.specializations} focusMode="enrollment" />
                                    </div>
                                )}
                                {(mode === 'graduation' || mode === 'board' || mode === 'tracer') && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                        <OutcomesModule 
                                          canEdit={true} 
                                          isBoardProgram={program?.isBoardProgram} 
                                          program={program || undefined} 
                                          focusMode={mode}
                                        />
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </form>
                </FormProvider>
            )}
        </div>

        <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <div className="flex w-full items-center justify-between">
                <div className="flex items-start gap-3 max-w-md">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                        <strong>Quality Note:</strong> Changes made here will immediately update the institutional roadmap and maturity index for the Academic Year {selectedYear}.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-bold text-[10px] uppercase">Cancel</Button>
                    <Button type="submit" form="batch-form" disabled={isSaving} className="min-w-[160px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest h-10">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-1.5" />}
                        Apply & Sync
                    </Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
