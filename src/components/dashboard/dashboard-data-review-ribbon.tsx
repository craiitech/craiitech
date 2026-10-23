'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createHomeDashboardFingerprint } from '@/lib/home-dashboard-review';
import type {
  AcademicProgram,
  AuditSchedule,
  CampusSetting,
  CorrectiveActionRequest,
  HomeDashboardReview,
  ProgramComplianceRecord,
  Risk,
  Submission,
  Unit,
} from '@/lib/types';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc, updateDoc } from '@/firebase/firestore-wrapper';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, ShieldCheck } from 'lucide-react';

type DashboardDataReviewRibbonProps = {
  scope: 'university' | 'unit';
  selectedUnitId: string;
  selectedYear: number;
  units: Unit[];
  submissions: Submission[];
  risks: Risk[];
  cars: CorrectiveActionRequest[];
  compliances: ProgramComplianceRecord[];
  programs: AcademicProgram[];
  schedules: AuditSchedule[];
};

function formatReviewDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : (value as { toDate?: () => Date }).toDate?.();
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function DashboardDataReviewRibbon({
  scope,
  selectedUnitId,
  selectedYear,
  units,
  submissions,
  risks,
  cars,
  compliances,
  programs,
  schedules,
}: DashboardDataReviewRibbonProps) {
  const firestore = useFirestore();
  const { user, userProfile, isAdmin, isVp, isVpOffice } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'campusSettings', 'global') : null),
    [firestore],
  );
  const reviewsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'homeDashboardReviews') : null),
    [firestore],
  );
  const { data: settings } = useDoc<CampusSetting>(settingsRef);
  const { data: reviews, isLoading: isLoadingReviews } = useCollection<HomeDashboardReview>(reviewsRef);

  const fingerprints = useMemo(() => {
    return Object.fromEntries(
      units.map((unit) => {
        const campusIds = unit.campusIds || [];
        const unitPrograms = programs.filter((program) => campusIds.includes(program.campusId));
        const scopedPrograms = unitPrograms.length ? unitPrograms : programs;
        const programIds = new Set(scopedPrograms.map((program) => program.id));
        const unitSchedules = schedules.filter(
          (schedule) =>
            (schedule.targetType === 'Unit' && schedule.targetId === unit.id) || campusIds.includes(schedule.campusId),
        );
        const fingerprint = createHomeDashboardFingerprint({
          academicYear: selectedYear,
          submissions: submissions.filter((item) => item.unitId === unit.id),
          risks: risks.filter((item) => item.unitId === unit.id),
          cars: cars.filter(
            (item) => item.unitId === unit.id || item.assignedUnits?.some((assigned) => assigned.unitId === unit.id),
          ),
          compliances: compliances.filter((item) => item.unitId === unit.id || programIds.has(item.programId)),
          programs: scopedPrograms,
          schedules: unitSchedules,
        });
        return [unit.id, fingerprint];
      }),
    );
  }, [units, selectedYear, submissions, risks, cars, compliances, programs, schedules]);

  const recordsForYear = useMemo(
    () => (reviews || []).filter((review) => review.academicYear === selectedYear),
    [reviews, selectedYear],
  );
  const recordByUnit = useMemo(
    () => new Map(recordsForYear.map((review) => [review.unitId, review])),
    [recordsForYear],
  );
  const reviewers = settings?.homeDashboardReviewers || {};
  const verifiers = settings?.homeDashboardVerifiers || {};

  const currentUnit = units.find((unit) => unit.id === selectedUnitId);
  const currentRecord = currentUnit ? recordByUnit.get(currentUnit.id) : undefined;
  const currentFingerprint = currentUnit ? fingerprints[currentUnit.id] : undefined;
  const isConfirmed = !!currentRecord && currentRecord.confirmationFingerprint === currentFingerprint;
  const isVerified =
    isConfirmed && currentRecord?.status === 'verified' && currentRecord.verifiedFingerprint === currentFingerprint;
  const canConfirm = !!currentUnit && !!user?.uid && reviewers[currentUnit.id] === user.uid;
  const canVerify =
    !!currentUnit && !!user?.uid && (isAdmin || isVp || isVpOffice || verifiers[currentUnit.id] === user.uid);

  const freshConfirmedCount = units.filter((unit) => {
    const record = recordByUnit.get(unit.id);
    return !!record && record.confirmationFingerprint === fingerprints[unit.id];
  }).length;
  const freshVerifiedCount = units.filter((unit) => {
    const record = recordByUnit.get(unit.id);
    return (
      !!record &&
      record.confirmationFingerprint === fingerprints[unit.id] &&
      record.status === 'verified' &&
      record.verifiedFingerprint === fingerprints[unit.id]
    );
  }).length;
  const unassignedUnitCount = units.filter((unit) => !reviewers[unit.id] || !verifiers[unit.id]).length;
  const allUnitsVerified = units.length > 0 && unassignedUnitCount === 0 && freshVerifiedCount === units.length;

  const handleConfirm = async () => {
    if (!firestore || !currentUnit || !currentFingerprint || !user?.uid || !canConfirm) return;
    setIsSaving(true);
    try {
      const reviewId = `${selectedYear}_${currentUnit.id}`;
      await setDoc(
        doc(firestore, 'homeDashboardReviews', reviewId),
        {
          unitId: currentUnit.id,
          academicYear: selectedYear,
          confirmationFingerprint: currentFingerprint,
          confirmedById: user.uid,
          confirmedByName: userProfile
            ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
            : user.email || 'Reviewer',
          confirmedAt: serverTimestamp(),
          verifiedFingerprint: null,
          verifiedById: null,
          verifiedByName: null,
          verifiedAt: null,
          status: 'confirmed',
        },
        { merge: true },
      );
      toast({
        title: 'Dashboard data confirmed',
        description: `${currentUnit.name} is confirmed for AY ${selectedYear}.`,
      });
    } catch (error) {
      console.error('Failed to confirm home dashboard data:', error);
      toast({
        title: 'Confirmation failed',
        description: error instanceof Error ? error.message : 'Could not save the confirmation.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
    if (
      !firestore ||
      !currentUnit ||
      !currentRecord ||
      !currentFingerprint ||
      !user?.uid ||
      !canVerify ||
      !isConfirmed
    ) {
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'homeDashboardReviews', currentRecord.id), {
        status: 'verified',
        verifiedFingerprint: currentFingerprint,
        verifiedById: user.uid,
        verifiedByName: userProfile
          ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
          : user.email || 'Reviewer',
        verifiedAt: serverTimestamp(),
      });
      toast({
        title: 'Dashboard data verified',
        description: `${currentUnit.name} is verified for AY ${selectedYear}.`,
      });
    } catch (error) {
      console.error('Failed to verify home dashboard data:', error);
      toast({
        title: 'Verification failed',
        description: error instanceof Error ? error.message : 'Could not save the verification.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = isVerified
    ? 'Verified'
    : isConfirmed
      ? 'Confirmed — awaiting verification'
      : currentRecord
        ? 'Changes detected — confirmation required'
        : 'Awaiting unit confirmation';

  const currentDate = isVerified
    ? formatReviewDate(currentRecord?.verifiedAt)
    : formatReviewDate(currentRecord?.confirmedAt);
  const currentReviewer = isVerified ? currentRecord?.verifiedByName : currentRecord?.confirmedByName;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {scope === 'university' ? (
          allUnitsVerified ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )
        ) : isVerified ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : currentRecord ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        ) : (
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wide">Data review · AY {selectedYear}</span>
            <Badge
              variant="outline"
              className={
                (scope === 'university' ? allUnitsVerified : isVerified)
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }
            >
              {scope === 'university' ? (allUnitsVerified ? 'Verified' : 'Review in progress') : currentStatus}
            </Badge>
          </div>
          {scope === 'university' ? (
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              {freshVerifiedCount} of {units.length} units verified · {freshConfirmedCount} confirmed
              {unassignedUnitCount > 0 && ` · ${unassignedUnitCount} units missing reviewer assignments`}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              {currentUnit?.name || 'Select a unit'} ·{' '}
              {currentDate
                ? `Last review ${currentDate}${currentReviewer ? ` by ${currentReviewer}` : ''}`
                : 'No review recorded for this data snapshot'}
              {currentRecord && !isConfirmed && ' · displayed data has changed since confirmation'}
            </p>
          )}
        </div>
      </div>

      {scope === 'unit' && currentUnit && (
        <div className="flex flex-wrap items-center gap-2">
          {canConfirm && !isConfirmed && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-[10px] font-bold uppercase"
              onClick={handleConfirm}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm data updated
            </Button>
          )}
          {canVerify && isConfirmed && !isVerified && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[10px] font-bold uppercase"
              onClick={handleVerify}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Verify confirmation
            </Button>
          )}
          {isVerified && currentRecord?.verifiedByName && (
            <span className="text-[10px] font-semibold text-emerald-700">
              Verified by {currentRecord.verifiedByName}
            </span>
          )}
          {isLoadingReviews && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
      )}
      {scope === 'university' && !allUnitsVerified && canVerify && (
        <p className="text-[10px] font-medium text-slate-500">
          Select Unit View to verify each unit after its assigned reviewer confirms.
        </p>
      )}
    </div>
  );
}
