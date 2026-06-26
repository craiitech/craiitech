'use client';

import { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, Timestamp } from '@/firebase/firestore-wrapper';
import { Loader2 } from 'lucide-react';
import type { OkrKeyResult } from '@/lib/types';

interface OkrCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
  keyResults: OkrKeyResult[];
  onSuccess?: () => void;
}

export function OkrCheckInDialog({ open, onOpenChange, objectiveId, keyResults, onSuccess }: OkrCheckInDialogProps) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleOpen = useCallback((isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      const initial: Record<string, number> = {};
      const initialConf: Record<string, number> = {};
      keyResults.forEach(kr => {
        initial[kr.id] = kr.currentValue;
        initialConf[kr.id] = 70;
      });
      setValues(initial);
      setConfidences(initialConf);
      setComment('');
    }
  }, [onOpenChange, keyResults]);

  const submitCheckIn = async () => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    try {
      const batch = keyResults.map(async (kr) => {
        const newValue = values[kr.id] ?? kr.currentValue;
        const confidence = confidences[kr.id] ?? 70;

        await addDoc(collection(firestore, 'okrCheckIns'), {
          krId: kr.id,
          objectiveId,
          value: newValue,
          confidence,
          comment,
          updatedBy: userProfile.id,
          updatedByName: `${userProfile.firstName} ${userProfile.lastName}`,
          updatedAt: Timestamp.now(),
        });
      });

      await Promise.all(batch);

      toast({
        title: 'Check-in Submitted',
        description: 'Your OKR progress has been recorded.',
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to submit check-in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">OKR Check-in</DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Update your progress and confidence level for each key result.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {keyResults.map(kr => (
            <div key={kr.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">{kr.title}</Label>
                <span className="text-[10px] font-black text-muted-foreground">
                  Target: {kr.targetValue} {kr.unit}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={values[kr.id] ?? kr.currentValue}
                  onChange={(e) => setValues(prev => ({ ...prev, [kr.id]: Number(e.target.value) }))}
                  className="w-24 text-sm font-bold"
                  min={0}
                  step={kr.type === 'binary' ? 1 : 0.1}
                />
                <span className="text-xs font-bold text-muted-foreground">/ {kr.targetValue} {kr.unit}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                  <span>Confidence</span>
                  <span>{confidences[kr.id] ?? 70}%</span>
                </div>
                <Slider
                  value={[confidences[kr.id] ?? 70]}
                  onValueChange={([v]) => setConfidences(prev => ({ ...prev, [kr.id]: v }))}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-xs font-bold">General Comment</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What progress was made? Any blockers?"
              className="text-sm min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs font-bold">
            Cancel
          </Button>
          <Button onClick={submitCheckIn} disabled={isSubmitting} className="text-xs font-bold">
            {isSubmitting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...</> : 'Submit Check-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
