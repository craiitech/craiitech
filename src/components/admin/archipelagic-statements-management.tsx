'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Target, Compass, ShieldCheck, Save } from 'lucide-react';
import type { ArchipelagicStatements } from '@/lib/types';

export function ArchipelagicStatementsManagement() {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();

  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [qualityPolicy, setQualityPolicy] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const statementsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'archipelagicStatements') : null),
    [firestore],
  );

  const { data, isLoading } = useDoc<ArchipelagicStatements>(statementsRef);

  useEffect(() => {
    if (!data) return;
    setVision(data.vision || '');
    setMission(data.mission || '');
    setQualityPolicy(data.qualityPolicy || '');
  }, [data]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(
        doc(firestore, 'system', 'archipelagicStatements'),
        {
          vision: vision.trim(),
          mission: mission.trim(),
          qualityPolicy: qualityPolicy.trim(),
          updatedAt: serverTimestamp(),
          updatedBy: userProfile?.id || 'admin',
          updatedByName: userProfile?.firstName
            ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
            : 'Administrator',
        },
        { merge: true },
      );
      toast({
        title: 'Success',
        description: 'Archipelagic institutional statements updated.',
      });
    } catch (error) {
      console.error('Error updating archipelagic statements:', error);
      const message = error instanceof Error ? error.message : 'Could not update institutional statements.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = !isAdmin;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          Archipelagic University Institutional Statements
        </CardTitle>
        <CardDescription>
          Maintain the official Vision, Mission, and Quality Policy statements that guide the Archipelagic Intelligence
          (AQ) framework.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading institutional statements...
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-bold text-xs">
                <Target className="h-3.5 w-3.5 text-primary" />
                1. Archipelagic University Vision Statement
              </Label>
              <Textarea
                placeholder="Enter the Archipelagic University Vision Statement..."
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                rows={3}
                disabled={isSaving || isReadOnly}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-bold text-xs">
                <Compass className="h-3.5 w-3.5 text-emerald-600" />
                2. Archipelagic University Mission
              </Label>
              <Textarea
                placeholder="Enter the Archipelagic University Mission..."
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                rows={3}
                disabled={isSaving || isReadOnly}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-bold text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                3. Archipelagic University Quality Policy Statement
              </Label>
              <Textarea
                placeholder="Enter the Archipelagic University Quality Policy Statement..."
                value={qualityPolicy}
                onChange={(e) => setQualityPolicy(e.target.value)}
                rows={3}
                disabled={isSaving || isReadOnly}
              />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end border-t bg-muted/10 py-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading || isReadOnly}
          className="font-black uppercase text-xs tracking-wider"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Statements
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
