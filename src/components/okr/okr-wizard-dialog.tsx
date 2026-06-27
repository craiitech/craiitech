'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from '@/firebase/firestore-wrapper';
import { Loader2, Sparkles, Check, ChevronRight, ChevronLeft, Target, BrainCircuit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useYear } from '@/lib/year-provider';
import { generateOkrSuggestions, type OkrSuggestion, type DataInventory } from '@/lib/kpi-suggestions';
import type {
  Submission, Risk, CorrectiveActionRequest, Unit, Cycle,
  AuditPlan, CsmResponse, GADPlan, GADActivity,
  AttendanceActivity, ActivityAttendanceLog, ActivityEvaluation,
  OkrObjective, OkrKeyResult, KpiDefinition,
} from '@/lib/types';

interface OkrWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissions: Submission[] | null;
  risks: Risk[] | null;
  cars: CorrectiveActionRequest[] | null;
  units: Unit[] | null;
  cycles: Cycle[] | null;
  auditPlans: AuditPlan[] | null;
  csmResponses: CsmResponse[] | null;
  activities: AttendanceActivity[] | null;
  activityLogs: ActivityAttendanceLog[] | null;
  evaluations: ActivityEvaluation[] | null;
  okrObjectives: OkrObjective[] | null;
  okrKeyResults: OkrKeyResult[] | null;
  selectedYear: number;
}

export function OkrWizardDialog({
  open, onOpenChange,
  submissions, risks, cars, units, cycles, auditPlans, csmResponses,
  activities, activityLogs, evaluations, okrObjectives, okrKeyResults, selectedYear,
}: OkrWizardDialogProps) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dataInventory: DataInventory = useMemo(() => ({
    submissions, risks, cars, units, cycles, auditPlans, csmResponses,
    activities: activities || null,
    activityLogs: activityLogs || null,
    evaluations: evaluations || null,
    gadPlans: null, gadActivities: null,
    okrObjectives: okrObjectives || null,
    okrKeyResults: okrKeyResults || null,
    existingDefinitions: null,
    selectedYear,
  }), [submissions, risks, cars, units, cycles, auditPlans, csmResponses,
      activities, activityLogs, evaluations, okrObjectives, okrKeyResults, selectedYear]);

  const suggestions = useMemo(() => {
    if (!hasGenerated) return [];
    return generateOkrSuggestions(dataInventory);
  }, [dataInventory, hasGenerated]);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    const generated = generateOkrSuggestions(dataInventory);
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
      setSelectedIds(new Set(generated.map(s => s.id)));
      setStep(1);
    }, 600);
  }, [dataInventory]);

  const handleCreate = useCallback(async () => {
    if (!firestore || !userProfile) return;
    setIsSaving(true);
    let successCount = 0;
    try {
      for (const id of selectedIds) {
        const sug = suggestions.find(s => s.id === id);
        if (!sug) continue;

        const objRef = await addDoc(collection(firestore, 'okrObjectives'), {
          title: sug.title,
          description: sug.description,
          entityType: sug.entityType,
          entityId: userProfile.unitId || userProfile.campusId || 'institution',
          year: selectedYear,
          quarter: sug.quarter,
          ownerId: userProfile.id,
          ownerName: `${userProfile.firstName} ${userProfile.lastName}`,
          status: 'active',
          confidenceScore: 50,
          progressPercentage: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        for (const kr of sug.keyResults) {
          await addDoc(collection(firestore, 'okrKeyResults'), {
            objectiveId: objRef.id,
            title: kr.title,
            type: kr.type,
            startingValue: kr.startingValue,
            currentValue: kr.startingValue,
            targetValue: kr.targetValue,
            unit: kr.unit,
            weight: 1,
            ownerId: userProfile.id,
            ownerName: `${userProfile.firstName} ${userProfile.lastName}`,
            createdAt: Timestamp.now(),
          });
        }
        successCount++;
      }
      toast({ title: 'OKRs Created', description: `${successCount} objective(s) created with key results.` });
      onOpenChange(false);
      setHasGenerated(false);
      setStep(0);
      setSelectedIds(new Set());
    } catch {
      toast({ title: 'Error', description: 'Failed to create some OKRs.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [firestore, userProfile, selectedYear, selectedIds, suggestions, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(0);
      setHasGenerated(false);
      setSelectedIds(new Set());
    }, 200);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-indigo-500" />
            OKR Wizard
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            {step === 0 && 'Auto-generate OKRs based on system data and performance gaps.'}
            {step === 1 && 'Review suggested objectives and their key results.'}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="py-6 space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-indigo-800 dark:text-indigo-200 uppercase tracking-wider">
                    Intelligent OKR Generation
                  </p>
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">
                    The wizard analyzes your submission rates, risk closure, CAR status, and
                    activity attendance to detect performance gaps. It suggests measurable
                    objectives with auto-populated key results starting from your actual data.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { key: 'submissions', label: 'Submissions', count: submissions?.length || 0 },
                { key: 'risks', label: 'Risks', count: risks?.length || 0 },
                { key: 'cars', label: 'CARs', count: cars?.length || 0 },
                { key: 'activities', label: 'Unit Activities', count: activities?.length || 0 },
                { key: 'activityLogs', label: 'Attendance Logs', count: activityLogs?.length || 0 },
                { key: 'okrObjectives', label: 'Existing OKRs', count: okrObjectives?.length || 0 },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-black tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="py-4 space-y-4">
            {suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Check className="h-10 w-10 text-emerald-500 mb-3" />
                <p className="text-sm font-bold text-muted-foreground">No OKR suggestions available</p>
                <p className="text-xs text-muted-foreground/60 mt-1">All performance areas appear to be satisfactory.</p>
              </div>
            ) : (
              suggestions.map(sug => {
                const isSelected = selectedIds.has(sug.id);
                return (
                  <div key={sug.id} className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                    onClick={() => {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(sug.id)) next.delete(sug.id);
                        else next.add(sug.id);
                        return next;
                      });
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black">{sug.title}</span>
                          <Badge variant={sug.confidence === 'high' ? 'default' : 'secondary'} className="text-[7px] h-4 px-1 font-black uppercase">
                            {sug.confidence}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{sug.description}</p>
                        {sug.reason && (
                          <p className="text-[8px] text-muted-foreground/60 mt-0.5 italic">Why: {sug.reason}</p>
                        )}
                        <div className="mt-2 space-y-1">
                          {sug.keyResults.map((kr, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[9px] text-muted-foreground">
                              <Target className="h-2.5 w-2.5 shrink-0" />
                              <span className="font-medium">{kr.title}</span>
                              <Badge variant="outline" className="text-[6px] h-3.5 px-1 font-black">{kr.type}</Badge>
                              <span className="tabular-nums">{kr.startingValue} → {kr.targetValue}{kr.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-4 gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="text-xs font-bold">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
          )}
          {step === 0 && (
            <Button onClick={handleGenerate} disabled={isGenerating} className="text-xs font-bold">
              {isGenerating ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analyzing...</> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Suggestions</>}
            </Button>
          )}
          {step === 1 && selectedIds.size > 0 && (
            <Button onClick={handleCreate} disabled={isSaving} className="text-xs font-bold">
              {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Creating...</> : `Create ${selectedIds.size} OKR(s)`}
            </Button>
          )}
          {step === 1 && suggestions.length > 0 && selectedIds.size === 0 && (
            <Button variant="secondary" onClick={() => setSelectedIds(new Set(suggestions.map(s => s.id)))} className="text-xs font-bold">
              Select All
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
