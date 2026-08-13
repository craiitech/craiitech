'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { UnitOrgStructure } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Building2,
  Link as LinkIcon,
  Hash,
  Calendar,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  FileBadge,
  Info,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrgStructureUploadCardProps {
  year: number;
  cycleId: 'first' | 'final';
  unitId: string;
  campusId: string;
  unitName: string;
  canSubmit: boolean;
  /** Called whenever the submitted status changes — true = submitted, false = missing */
  onStatusChange?: (isSubmitted: boolean) => void;
}

export function OrgStructureUploadCard({
  year,
  cycleId,
  unitId,
  campusId,
  unitName,
  canSubmit,
  onStatusChange,
}: OrgStructureUploadCardProps) {
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();

  const [showCarryOverDialog, setShowCarryOverDialog] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formLink, setFormLink] = useState('');
  const [formRevision, setFormRevision] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch records for this unit + year
  const orgStructuresQuery = useMemoFirebase(
    () =>
      firestore && unitId
        ? query(collection(firestore, 'unitOrgStructures'), where('unitId', '==', unitId), where('year', '==', year))
        : null,
    [firestore, unitId, year],
  );
  const { data: orgStructures, isLoading } = useCollection<UnitOrgStructure>(orgStructuresQuery);

  const firstCycleRecord = useMemo(() => orgStructures?.find((r) => r.cycleId === 'first'), [orgStructures]);
  const finalCycleRecord = useMemo(() => orgStructures?.find((r) => r.cycleId === 'final'), [orgStructures]);

  const currentRecord = cycleId === 'first' ? firstCycleRecord : finalCycleRecord;
  const hasFirstCycleBaseline = !!firstCycleRecord;
  const cycleName = cycleId === 'first' ? 'First Cycle' : 'Final Cycle';
  const isSubmitted = !!currentRecord;

  // Notify parent of status changes
  useEffect(() => {
    if (!isLoading) {
      onStatusChange?.(isSubmitted);
    }
  }, [isSubmitted, isLoading, onStatusChange]);

  const getUploaderName = () => {
    const nameFromParts = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ');
    if (nameFromParts) return nameFromParts;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email;
    return 'Unit Official';
  };

  const handleCarryOver = async () => {
    if (!firestore || !user || !userProfile || !firstCycleRecord) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'unitOrgStructures'), {
        unitId,
        unitName,
        campusId,
        year,
        cycleId: 'final',
        googleDriveLink: firstCycleRecord.googleDriveLink,
        revisionNumber: firstCycleRecord.revisionNumber,
        revisionDate: firstCycleRecord.revisionDate,
        submittedBy: getUploaderName(),
        submittedById: user.uid,
        createdAt: serverTimestamp(),
        isCarriedOver: true,
      });
      toast({
        title: 'Carried Over',
        description: 'First Cycle Organizational Structure carried over for the Final Cycle.',
      });
      setShowCarryOverDialog(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to carry over record.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const trimmedLink = formLink.trim();
    const trimmedRevision = formRevision.trim();

    if (!trimmedLink) {
      toast({ title: 'Missing Link', description: 'Please provide a Google Drive link.', variant: 'destructive' });
      return;
    }
    if (!trimmedLink.startsWith('http://') && !trimmedLink.startsWith('https://')) {
      toast({
        title: 'Invalid URL Format',
        description: 'Google Drive link must begin with http:// or https://',
        variant: 'destructive',
      });
      return;
    }
    if (!trimmedRevision) {
      toast({ title: 'Missing Revision', description: 'Please provide a revision number.', variant: 'destructive' });
      return;
    }
    if (!firestore || !user || !userProfile) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'unitOrgStructures'), {
        unitId,
        unitName,
        campusId,
        year,
        cycleId,
        googleDriveLink: trimmedLink,
        revisionNumber: trimmedRevision,
        revisionDate: formDate,
        submittedBy: getUploaderName(),
        submittedById: user.uid,
        createdAt: serverTimestamp(),
        isCarriedOver: false,
      });
      toast({
        title: 'Organizational Structure Saved',
        description: `Rev. ${trimmedRevision} uploaded for ${cycleName}.`,
      });
      setShowForm(false);
      setFormLink('');
      setFormRevision('');
      setFormDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to save. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-3">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Record Already Exists — Read-only view
  if (currentRecord) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-emerald-50 border-b border-emerald-100 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-sm font-black uppercase tracking-tight text-emerald-800">
                Unit Organizational Structure
              </CardTitle>
              <Badge className="bg-rose-100 text-rose-700 border-none h-4 text-[7px] font-black uppercase px-1.5">
                Required
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {currentRecord.isCarriedOver && (
                <Badge className="bg-blue-100 text-blue-700 border-none h-5 text-[8px] font-black uppercase gap-1">
                  <RotateCcw className="h-2.5 w-2.5" />
                  Carried Over
                </Badge>
              )}
              <Badge className="bg-emerald-100 text-emerald-700 border-none h-5 text-[8px] font-black uppercase">
                {cycleName} ✓ Submitted
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                <Hash className="h-2.5 w-2.5" /> Revision No.
              </p>
              <p className="font-black text-slate-800 text-sm">{currentRecord.revisionNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" /> Date of Revision
              </p>
              <p className="font-bold text-slate-800">{currentRecord.revisionDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                <FileBadge className="h-2.5 w-2.5" /> Submitted By
              </p>
              <p className="font-bold text-slate-800 truncate">{currentRecord.submittedBy}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-emerald-100">
            <div className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2 min-w-0">
              <LinkIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-mono text-slate-600 truncate">{currentRecord.googleDriveLink}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[9px] font-black uppercase border-emerald-300 text-emerald-700 hover:bg-emerald-50 shrink-0"
              onClick={() => window.open(currentRecord.googleDriveLink, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1.5" /> Open PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Final Cycle — Show prompt card (before user decides)
  if (cycleId === 'final' && !showForm) {
    return (
      <>
        <Card className="border-rose-300 shadow-sm overflow-hidden">
          <CardHeader className="bg-rose-50 border-b border-rose-100 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-black uppercase tracking-tight text-rose-800">
                    Unit Organizational Structure
                  </CardTitle>
                  <Badge className="bg-rose-600 text-white border-none h-4 text-[7px] font-black uppercase px-1.5 shrink-0">
                    Required
                  </Badge>
                </div>
                <CardDescription className="text-[10px] font-bold uppercase text-rose-500 mt-0.5">
                  Final Cycle — {year} · Pending Submission
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {hasFirstCycleBaseline ? (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-xs font-black uppercase text-blue-800">
                  First Cycle Baseline Found
                </AlertTitle>
                <AlertDescription className="text-[11px] font-medium text-blue-700 leading-relaxed mt-1">
                  Your unit already uploaded an organizational structure for the First Cycle (
                  <strong>Rev. {firstCycleRecord?.revisionNumber}</strong>, dated{' '}
                  <strong>{firstCycleRecord?.revisionDate}</strong>). Indicate if there are any updates for the Final
                  Cycle.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-xs font-black uppercase text-amber-800">No First Cycle Baseline</AlertTitle>
                <AlertDescription className="text-[11px] font-medium text-amber-700 leading-relaxed mt-1">
                  No organizational structure was uploaded for the First Cycle. Please upload the current version now.
                </AlertDescription>
              </Alert>
            )}

            {canSubmit ? (
              <div className="flex flex-col sm:flex-row gap-3">
                {hasFirstCycleBaseline && (
                  <Button
                    variant="outline"
                    className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => setShowCarryOverDialog(true)}
                    disabled={isSubmitting}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    No Updates — Use Previous
                  </Button>
                )}
                <Button
                  className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/20"
                  onClick={() => setShowForm(true)}
                  disabled={isSubmitting}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-2" />
                  {hasFirstCycleBaseline ? 'Yes, I Have Updates' : 'Upload Organizational Structure'}
                </Button>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground font-bold uppercase text-center opacity-60">
                Read-only — Only Unit Coordinators / ODIMOs / Campus Officers can upload.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Carry-Over Confirmation Dialog */}
        <AlertDialog open={showCarryOverDialog} onOpenChange={setShowCarryOverDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase tracking-tight">
                Carry Over Organizational Structure?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-sm leading-relaxed" asChild>
                <div>
                  <p>
                    You are confirming that there are <strong>no updates</strong> to your unit&apos;s Organizational
                    Structure for the Final Cycle.
                  </p>
                  <div className="bg-muted p-3 rounded-lg text-xs space-y-1.5 my-3">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-primary" />
                      <span>
                        <strong>Revision:</strong> {firstCycleRecord?.revisionNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>
                        <strong>Date:</strong> {firstCycleRecord?.revisionDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate font-mono text-[10px]">{firstCycleRecord?.googleDriveLink}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    The system will record this as &quot;Carried Over&quot; and use the First Cycle link for your Final
                    Cycle reference.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowCarryOverDialog(false)}>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                onClick={() => {
                  setShowCarryOverDialog(false);
                  setShowForm(true);
                }}
                className="bg-transparent border border-primary text-primary hover:bg-primary/5"
              >
                I Have Updates Instead
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleCarryOver} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                Confirm — No Updates
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Upload Form (First Cycle, or Final Cycle with updates)
  return (
    <Card className="border-rose-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-rose-50 border-b border-rose-100 py-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-rose-600" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-black uppercase tracking-tight text-rose-800">
                Unit Organizational Structure
              </CardTitle>
              <Badge className="bg-rose-600 text-white border-none h-4 text-[7px] font-black uppercase px-1.5">
                Required
              </Badge>
            </div>
            <CardDescription className="text-[10px] font-bold uppercase text-rose-500 mt-0.5">
              {cycleName} — {year} · Upload Required
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-xs font-black uppercase text-blue-800">Upload Instructions</AlertTitle>
          <AlertDescription className="text-[11px] font-medium text-blue-700 leading-relaxed mt-1 space-y-1">
            <p>1. Upload the signed PDF of your unit&apos;s Organizational Structure to your Google Drive folder.</p>
            <p>
              2. Set the sharing permission to <strong>&quot;Anyone with the link can view&quot;</strong>.
            </p>
            <p>3. Paste the link below along with the revision number and date.</p>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
              <LinkIcon className="h-3 w-3" /> Google Drive PDF Link
            </Label>
            <Input
              placeholder="https://drive.google.com/file/d/..."
              value={formLink}
              onChange={(e) => setFormLink(e.target.value)}
              className="h-10 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Revision Number
              </Label>
              <Input
                placeholder="e.g. 00, 01, 02..."
                value={formRevision}
                onChange={(e) => setFormRevision(e.target.value)}
                className="h-10 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Date of Revision
              </Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-rose-100">
          {cycleId === 'final' && showForm && (
            <Button
              variant="ghost"
              className="h-10 text-[10px] font-black uppercase text-muted-foreground hover:bg-muted/50"
              onClick={() => setShowForm(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            className={cn('flex-1 h-10 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/20')}
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
            )}
            Submit Organizational Structure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
