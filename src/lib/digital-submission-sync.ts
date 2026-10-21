'use client';

import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  type Firestore,
} from '@/firebase/firestore-wrapper';
import type { OperationalPlanDocument, Submission } from '@/lib/types';
import { submissionTypes } from '@/lib/constants';
import { generateControlNumber, normalizeReportType } from '@/lib/utils';

export const DIGITAL_WORKSPACE_REPORT_TYPES = ['Operational Plan', 'Quality Objectives Monitoring'];

export const DIGITAL_SUITE_REPORT_TYPES = [...submissionTypes];

export type DigitalSubmissionStatus = 'submitted' | 'approved' | 'rejected';

type SyncActor = {
  id?: string;
  name?: string;
  role?: string;
};

type SyncOptions = {
  firestore: Firestore;
  plan: OperationalPlanDocument;
  reportTypes: string[];
  status: DigitalSubmissionStatus;
  actor?: SyncActor;
  effectiveDate?: Date | Timestamp | { toDate: () => Date } | null;
};

export type DigitalSyncResult = {
  created: number;
  updated: number;
  submissionIds: string[];
};

export type DigitalBackfillResult = {
  plans: number;
  created: number;
  updated: number;
  submissionIds: string[];
};

function toDate(value: SyncOptions['effectiveDate']): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof (value as any).toDate === 'function') return (value as any).toDate();
  if (typeof (value as any).seconds === 'number') return new Date((value as any).seconds * 1000);
  const parsed = new Date(value as any);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function submissionDocId(plan: OperationalPlanDocument, reportType: string) {
  const slug = normalizeReportType(reportType)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `digital_${plan.year}_${plan.cycleId}_${plan.unitId}_${slug}`.replace(/\//g, '_');
}

export async function syncDigitalPlanToSubmissions({
  firestore,
  plan,
  reportTypes,
  status,
  actor,
  effectiveDate,
}: SyncOptions): Promise<DigitalSyncResult> {
  const result: DigitalSyncResult = { created: 0, updated: 0, submissionIds: [] };

  if (!plan?.id || !plan?.unitId || !plan?.campusId || !plan?.year || !plan?.cycleId) {
    return result;
  }

  const year = Number(plan.year);
  const submissionDate = toDate(effectiveDate || plan.submittedAt || plan.approvedAt || plan.updatedAt);
  const actorId = plan.preparedById || actor?.id || '';
  const actorName = plan.preparedByName || actor?.name || 'Unit Official';
  const actorRole = actor?.role || 'Unit Official';

  const existingSnapshot = await getDocs(
    query(
      collection(firestore, 'submissions'),
      where('unitId', '==', plan.unitId),
      where('campusId', '==', plan.campusId),
      where('year', '==', year),
    ),
  );

  const existingSubmissions = existingSnapshot.docs.map((d) => ({
    id: d.id,
    data: d.data() as Submission,
  }));

  for (const reportType of reportTypes) {
    const normalizedType = normalizeReportType(reportType);
    const existing = existingSubmissions.find(
      (s) =>
        normalizeReportType(s.data.reportType) === normalizedType && String(s.data.cycleId) === String(plan.cycleId),
    );

    if (existing) {
      const updateData: Record<string, any> = {
        statusId: status,
        isDraft: false,
        unitName: plan.unitName,
        campusId: plan.campusId,
        unitId: plan.unitId,
        year,
        cycleId: plan.cycleId,
        userId: existing.data.userId || actorId,
        sourcePlanId: plan.id,
        source: 'unit-eoms-digital-document',
        dataEntryCompleted: true,
        submissionNeedsEntry: false,
      };

      if (status === 'submitted' || !existing.data.submissionDate) {
        updateData.submissionDate = submissionDate;
      }

      await updateDoc(doc(firestore, 'submissions', existing.id), updateData);
      result.updated += 1;
      result.submissionIds.push(existing.id);
      continue;
    }

    const reportCode =
      normalizedType === 'Operational Plan' && plan.opControlNumber
        ? plan.opControlNumber
        : generateControlNumber(plan.unitName || 'Unit', 0, normalizedType, submissionDate);

    const data = {
      userId: actorId,
      submissionDate,
      googleDriveLink: '',
      cycleId: plan.cycleId,
      statusId: status,
      reportType: normalizedType,
      year,
      unitName: plan.unitName,
      campusId: plan.campusId,
      unitId: plan.unitId,
      comments: [
        {
          text: `Generated from the Unit EOMS Digital Document by ${actorName} (${actorRole}).`,
          authorId: actorId,
          authorName: actorName,
          authorRole: actorRole,
          createdAt: new Date(),
        },
      ],
      revision: 0,
      controlNumber: reportCode,
      isDraft: false,
      submissionNeedsEntry: false,
      dataEntryCompleted: true,
      sourcePlanId: plan.id,
      source: 'unit-eoms-digital-document',
    };

    const newRef = doc(collection(firestore, 'submissions'), submissionDocId(plan, normalizedType));
    await setDoc(newRef, data, { merge: true });
    result.created += 1;
    result.submissionIds.push(newRef.id);
  }

  return result;
}

export async function syncDigitalPlanStatus(
  firestore: Firestore,
  planId: string,
  status: DigitalSubmissionStatus,
): Promise<number> {
  if (!planId) return 0;

  const snapshot = await getDocs(query(collection(firestore, 'submissions'), where('sourcePlanId', '==', planId)));

  let updated = 0;
  for (const submissionDoc of snapshot.docs) {
    await updateDoc(doc(firestore, 'submissions', submissionDoc.id), {
      statusId: status,
      isDraft: false,
    });
    updated += 1;
  }

  return updated;
}

export async function syncDigitalSubmissionStatusToPlan(
  firestore: Firestore,
  submission: Submission,
  actor?: SyncActor,
): Promise<boolean> {
  if (!submission?.sourcePlanId) return false;

  const planRef = doc(firestore, 'operationalPlans', submission.sourcePlanId);

  if (submission.statusId === 'rejected') {
    await updateDoc(planRef, {
      status: 'NeedsRevision',
      updatedAt: new Date(),
    });
    return true;
  }

  if (submission.statusId !== 'approved') return false;

  const linkedSnapshot = await getDocs(
    query(collection(firestore, 'submissions'), where('sourcePlanId', '==', submission.sourcePlanId)),
  );

  const allApproved = linkedSnapshot.docs.every((submissionDoc) => {
    if (submissionDoc.id === submission.id) return true;
    return (submissionDoc.data() as Submission).statusId === 'approved';
  });

  if (!allApproved) return false;

  await updateDoc(planRef, {
    status: 'Approved',
    approvedById: actor?.id || submission.userId,
    approvedByName: actor?.name || '',
    approvedAt: new Date(),
    updatedAt: new Date(),
  });

  return true;
}

export async function backfillDigitalPlanSubmissions(
  firestore: Firestore,
  actor?: SyncActor,
): Promise<DigitalBackfillResult> {
  const result: DigitalBackfillResult = { plans: 0, created: 0, updated: 0, submissionIds: [] };

  const plansSnapshot = await getDocs(
    query(collection(firestore, 'operationalPlans'), where('status', 'in', ['Submitted', 'Approved'])),
  );

  for (const planDoc of plansSnapshot.docs) {
    const plan = { id: planDoc.id, ...planDoc.data() } as OperationalPlanDocument;
    const isFullSuite = !!(plan.swotStatus || plan.nedStatus);
    const reportTypes = isFullSuite ? DIGITAL_SUITE_REPORT_TYPES : DIGITAL_WORKSPACE_REPORT_TYPES;
    const status: DigitalSubmissionStatus = plan.status === 'Approved' ? 'approved' : 'submitted';
    const effectiveDate = status === 'approved' ? plan.approvedAt || plan.submittedAt : plan.submittedAt;

    const syncResult = await syncDigitalPlanToSubmissions({
      firestore,
      plan,
      reportTypes,
      status,
      actor,
      effectiveDate,
    });

    result.plans += 1;
    result.created += syncResult.created;
    result.updated += syncResult.updated;
    result.submissionIds.push(...syncResult.submissionIds);
  }

  return result;
}
