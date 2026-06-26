'use client';

import { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, Timestamp } from '@/firebase/firestore-wrapper';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useYear } from '@/lib/year-provider';
import { OKR_QUARTERS, OKR_ENTITY_TYPES, KR_TYPES } from '@/lib/constants';

interface KeyResultInput {
  title: string;
  type: string;
  startingValue: number;
  targetValue: number;
  unit: string;
  weight: number;
}

interface OkrCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OkrCreateDialog({ open, onOpenChange, onSuccess }: OkrCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState('unit');
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3).toString());
  const [keyResults, setKeyResults] = useState<KeyResultInput[]>([
    { title: '', type: 'metric', startingValue: 0, targetValue: 100, unit: '%', weight: 1 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { selectedYear } = useYear();

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setEntityType('unit');
    setQuarter(Math.ceil((new Date().getMonth() + 1) / 3).toString());
    setKeyResults([{ title: '', type: 'metric', startingValue: 0, targetValue: 100, unit: '%', weight: 1 }]);
  }, []);

  const addKeyResult = () => {
    setKeyResults(prev => [...prev, { title: '', type: 'metric', startingValue: 0, targetValue: 100, unit: '%', weight: 1 }]);
  };

  const removeKeyResult = (index: number) => {
    setKeyResults(prev => prev.filter((_, i) => i !== index));
  };

  const updateKeyResult = (index: number, field: keyof KeyResultInput, value: any) => {
    setKeyResults(prev => prev.map((kr, i) => i === index ? { ...kr, [field]: value } : kr));
  };

  const submitOkr = async () => {
    if (!firestore || !userProfile) return;
    if (!title.trim()) {
      toast({ title: 'Validation Error', description: 'Objective title is required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const objRef = await addDoc(collection(firestore, 'okrObjectives'), {
        title: title.trim(),
        description: description.trim(),
        entityType,
        entityId: userProfile.unitId || userProfile.campusId || 'institution',
        year: selectedYear,
        quarter: Number(quarter),
        ownerId: userProfile.id,
        ownerName: `${userProfile.firstName} ${userProfile.lastName}`,
        status: 'active',
        confidenceScore: 70,
        progressPercentage: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      for (const kr of keyResults) {
        if (!kr.title.trim()) continue;
        await addDoc(collection(firestore, 'okrKeyResults'), {
          objectiveId: objRef.id,
          title: kr.title.trim(),
          type: kr.type,
          startingValue: kr.startingValue,
          currentValue: kr.startingValue,
          targetValue: kr.targetValue,
          unit: kr.unit,
          weight: kr.weight,
          ownerId: userProfile.id,
          ownerName: `${userProfile.firstName} ${userProfile.lastName}`,
          createdAt: Timestamp.now(),
        });
      }

      toast({ title: 'OKR Created', description: 'Your objective and key results have been saved.' });
      resetForm();
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create OKR.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) resetForm(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">Create New OKR</DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Define your objective and the key results that will measure success.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold">Objective Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Improve unit compliance rate" className="text-sm font-medium" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what success looks like..." className="text-sm min-h-[60px]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Scope</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OKR_ENTITY_TYPES.map(et => (
                    <SelectItem key={et} value={et}>{et.charAt(0).toUpperCase() + et.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Quarter</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OKR_QUARTERS.map(q => (
                    <SelectItem key={q} value={String(q)}>Q{q} {selectedYear}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold">Key Results</Label>
              <Button variant="outline" size="sm" onClick={addKeyResult} className="h-7 text-[9px] font-black">
                <Plus className="h-3 w-3 mr-1" /> Add KR
              </Button>
            </div>
            {keyResults.map((kr, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-muted-foreground">KR #{idx + 1}</span>
                  {keyResults.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeKeyResult(idx)} className="h-6 w-6 p-0">
                      <Trash2 className="h-3 w-3 text-rose-500" />
                    </Button>
                  )}
                </div>
                <Input
                  value={kr.title}
                  onChange={(e) => updateKeyResult(idx, 'title', e.target.value)}
                  placeholder="e.g., Increase submission rate to 90%"
                  className="text-sm font-medium"
                />
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[8px] font-bold text-muted-foreground">Type</Label>
                    <Select value={kr.type} onValueChange={(v) => updateKeyResult(idx, 'type', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KR_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] font-bold text-muted-foreground">Start</Label>
                    <Input
                      type="number"
                      value={kr.startingValue}
                      onChange={(e) => updateKeyResult(idx, 'startingValue', Number(e.target.value))}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] font-bold text-muted-foreground">Target</Label>
                    <Input
                      type="number"
                      value={kr.targetValue}
                      onChange={(e) => updateKeyResult(idx, 'targetValue', Number(e.target.value))}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] font-bold text-muted-foreground">Unit</Label>
                    <Input
                      value={kr.unit}
                      onChange={(e) => updateKeyResult(idx, 'unit', e.target.value)}
                      className="h-8 text-xs font-bold"
                      placeholder="%"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs font-bold">Cancel</Button>
          <Button onClick={submitOkr} disabled={isSubmitting} className="text-xs font-bold">
            {isSubmitting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Creating...</> : 'Create OKR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
