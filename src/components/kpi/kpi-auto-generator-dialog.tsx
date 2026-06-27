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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from '@/firebase/firestore-wrapper';
import { Loader2, Sparkles, Check, ChevronRight, ChevronLeft, AlertTriangle, BarChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { KPI_CATEGORIES } from '@/lib/constants';
import { scanForKpiSuggestions, type KpiSuggestion, type DataInventory } from '@/lib/kpi-suggestions';
import type {
  Submission, Risk, CorrectiveActionRequest, Unit, Cycle,
  AuditPlan, CsmResponse, GADPlan, GADActivity,
  AttendanceActivity, ActivityAttendanceLog, ActivityEvaluation,
  OkrObjective, OkrKeyResult, KpiDefinition,
} from '@/lib/types';

interface KpiAutoGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissions: Submission[] | null;
  risks: Risk[] | null;
  cars: CorrectiveActionRequest[] | null;
  units: Unit[] | null;
  cycles: Cycle[] | null;
  auditPlans: AuditPlan[] | null;
  csmResponses: CsmResponse[] | null;
  gadPlans: GADPlan[] | null;
  gadActivities: GADActivity[] | null;
  selectedYear: number;
}

export function KpiAutoGeneratorDialog({
  open, onOpenChange,
  submissions, risks, cars, units, cycles, auditPlans, csmResponses,
  gadPlans, gadActivities, selectedYear,
}: KpiAutoGeneratorDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editedSuggestions, setEditedSuggestions] = useState<Map<string, KpiSuggestion>>(new Map());

  const actQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'unitActivities') : null), [firestore]);
  const { data: activities } = useCollection<AttendanceActivity>(actQuery);
  const logQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'unitActivityAttendanceLogs') : null), [firestore]);
  const { data: activityLogs } = useCollection<ActivityAttendanceLog>(logQuery);
  const evalQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'unitActivityEvaluations') : null), [firestore]);
  const { data: evaluations } = useCollection<ActivityEvaluation>(evalQuery);
  const okrObjQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'okrObjectives') : null), [firestore]);
  const { data: okrObjectives } = useCollection<OkrObjective>(okrObjQuery);
  const okrKrQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'okrKeyResults') : null), [firestore]);
  const { data: okrKeyResults } = useCollection<OkrKeyResult>(okrKrQuery);
  const defsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'kpiDefinitions') : null), [firestore]);
  const { data: existingDefinitions } = useCollection<KpiDefinition>(defsQuery);

  const dataInventory: DataInventory = useMemo(() => ({
    submissions, risks, cars, units, cycles, auditPlans, csmResponses,
    activities: activities || null,
    activityLogs: activityLogs || null,
    evaluations: evaluations || null,
    gadPlans, gadActivities,
    okrObjectives: okrObjectives || null,
    okrKeyResults: okrKeyResults || null,
    existingDefinitions: existingDefinitions || null,
    selectedYear,
  }), [submissions, risks, cars, units, cycles, auditPlans, csmResponses,
      activities, activityLogs, evaluations, gadPlans, gadActivities,
      okrObjectives, okrKeyResults, existingDefinitions, selectedYear]);

  const suggestions = useMemo(() => {
    if (!hasScanned) return [];
    return scanForKpiSuggestions(dataInventory);
  }, [dataInventory, hasScanned]);

  const getSuggestion = useCallback((id: string): KpiSuggestion => {
    return editedSuggestions.get(id) || suggestions.find(s => s.id === id)!;
  }, [editedSuggestions, suggestions]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateSuggestion = useCallback((id: string, field: string, value: any) => {
    const original = suggestions.find(s => s.id === id);
    if (!original) return;
    const current = editedSuggestions.get(id) || original;
    editedSuggestions.set(id, { ...current, [field]: value });
    setEditedSuggestions(new Map(editedSuggestions));
  }, [suggestions, editedSuggestions]);

  const handleScan = useCallback(() => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);
      const allIds = suggestions.map(s => s.id);
      setSelectedIds(new Set(allIds));
      setStep(1);
    }, 800);
  }, [suggestions]);

  const handleCreate = useCallback(async () => {
    if (!firestore) return;
    setIsSaving(true);
    let successCount = 0;
    try {
      for (const id of selectedIds) {
        const sug = getSuggestion(id);
        if (!sug) continue;
        await addDoc(collection(firestore, 'kpiDefinitions'), {
          name: sug.name,
          description: sug.description,
          category: sug.category,
          formula: sug.dataSource,
          dataSource: sug.dataSource,
          unit: sug.unit,
          thresholds: sug.thresholds,
          defaultTarget: sug.defaultTarget,
          weight: sug.weight,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        successCount++;
      }
      toast({ title: 'KPIs Created', description: `${successCount} KPI definition(s) have been added.` });
      onOpenChange(false);
      setHasScanned(false);
      setStep(0);
      setSelectedIds(new Set());
    } catch {
      toast({ title: 'Error', description: 'Failed to create some KPI definitions.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [firestore, selectedIds, getSuggestion, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(0);
      setHasScanned(false);
      setSelectedIds(new Set());
      setEditedSuggestions(new Map());
    }, 200);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            KPI Auto-Generator
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            {step === 0 && 'Scan available data to discover suggested KPI definitions.'}
            {step === 1 && 'Review and customize suggested KPIs before creating them.'}
            {step === 2 && 'Editing KPI details — customize name, target, and thresholds.'}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="py-6 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <BarChart className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                    System Data Scan
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                    The generator will analyze your available collections —
                    submissions, risks, CARs, audits, CSM responses, GAD, unit activities, and OKRs —
                    and suggest KPI definitions that match the available data patterns.
                    You can review, customize, and batch-create them.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { key: 'submissions', label: 'Submissions', count: submissions?.length || 0 },
                { key: 'risks', label: 'Risks', count: risks?.length || 0 },
                { key: 'cars', label: 'CARs', count: cars?.length || 0 },
                { key: 'cycles', label: 'Cycles', count: cycles?.length || 0 },
                { key: 'auditPlans', label: 'Audit Plans', count: auditPlans?.length || 0 },
                { key: 'csmResponses', label: 'CSM Responses', count: csmResponses?.length || 0 },
                { key: 'activities', label: 'Unit Activities', count: activities?.length || 0 },
                { key: 'evaluations', label: 'Activity Eval\'ns', count: evaluations?.length || 0 },
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
          <div className="py-4 space-y-3">
            {suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Check className="h-10 w-10 text-emerald-500 mb-3" />
                <p className="text-sm font-bold text-muted-foreground">All KPI types already defined</p>
                <p className="text-xs text-muted-foreground/60 mt-1">No new KPI suggestions available — all data sources already have definitions.</p>
              </div>
            ) : (
              suggestions.map(sug => {
                const s = getSuggestion(sug.id);
                const isSelected = selectedIds.has(sug.id);
                return (
                  <div key={sug.id} className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                    onClick={() => toggleSelected(sug.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black">{s.name}</span>
                            <Badge variant={s.confidence === 'high' ? 'default' : s.confidence === 'medium' ? 'secondary' : 'outline'} className="text-[7px] h-4 px-1 font-black uppercase">
                              {s.confidence}
                            </Badge>
                            <Badge variant="outline" className="text-[7px] h-4 px-1 font-black">
                              {KPI_CATEGORIES[s.category] || s.category}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-[9px] font-bold text-muted-foreground">
                            <span>Target: {s.defaultTarget}{s.unit}</span>
                            {s.hasData && <span>Current: ~{s.currentEstimate}{s.unit}</span>}
                          </div>
                          {s.reason && (
                            <p className="text-[8px] text-muted-foreground/60 mt-1 italic">{s.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black shrink-0"
                        onClick={(e) => { e.stopPropagation(); setStep(2); }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {step === 2 && (
          <div className="py-4 space-y-4">
            {Array.from(selectedIds).map(id => {
              const s = getSuggestion(id);
              return (
                <div key={id} className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[10px] font-bold">Name</Label>
                      <Input value={s.name} onChange={(e) => updateSuggestion(id, 'name', e.target.value)} className="text-sm font-bold" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[10px] font-bold">Description</Label>
                      <Textarea value={s.description} onChange={(e) => updateSuggestion(id, 'description', e.target.value)} className="text-sm min-h-[50px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold">Category</Label>
                      <Select value={s.category} onValueChange={(v) => updateSuggestion(id, 'category', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(KPI_CATEGORIES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold">Target ({s.unit})</Label>
                      <Input type="number" value={s.defaultTarget} onChange={(e) => updateSuggestion(id, 'defaultTarget', Number(e.target.value))} className="text-sm font-bold" min={0} max={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold">Good &ge;</Label>
                      <Input type="number" value={s.thresholds.good} onChange={(e) => {
                        const t = { ...s.thresholds, good: Number(e.target.value) };
                        updateSuggestion(id, 'thresholds', t);
                      }} className="text-sm font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold">Satisfactory &ge;</Label>
                      <Input type="number" value={s.thresholds.satisfactory} onChange={(e) => {
                        const t = { ...s.thresholds, satisfactory: Number(e.target.value) };
                        updateSuggestion(id, 'thresholds', t);
                      }} className="text-sm font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold">Threshold Direction</Label>
                      <Select value={s.thresholds.direction} onValueChange={(v: 'higher_is_better' | 'lower_is_better') => {
                        const t = { ...s.thresholds, direction: v };
                        updateSuggestion(id, 'thresholds', t);
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="higher_is_better">Higher is Better</SelectItem>
                          <SelectItem value="lower_is_better">Lower is Better</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold">Weight</Label>
                      <Input type="number" value={s.weight} onChange={(e) => updateSuggestion(id, 'weight', Number(e.target.value))} className="text-sm font-bold" min={0} max={10} step={0.5} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="border-t pt-4 gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="text-xs font-bold">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
          )}
          {step === 0 && (
            <Button onClick={handleScan} disabled={isScanning} className="text-xs font-bold">
              {isScanning ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Scanning...</> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Scan Data & Generate</>}
            </Button>
          )}
          {step === 1 && selectedIds.size > 0 && (
            <Button onClick={() => setStep(2)} className="text-xs font-bold">
              Customize ({selectedIds.size}) <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
          {step === 1 && selectedIds.size === 0 && suggestions.length > 0 && (
            <Button variant="secondary" onClick={() => {
              const allIds = suggestions.map(s => s.id);
              setSelectedIds(new Set(allIds));
            }} className="text-xs font-bold">
              Select All
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleCreate} disabled={isSaving} className="text-xs font-bold">
              {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Creating...</> : `Create ${selectedIds.size} KPI(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
