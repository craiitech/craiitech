import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from '@/firebase/firestore-wrapper';
import type {
  GADCategory,
  GADImplementationStatus,
  GADMainstreamingPillar,
  GADSector,
  MonthlyAccomplishmentEntry,
  CMOMovRecord,
  CMOSubmission,
} from './types';
import { calculateHgdgAttributionRate, CMO_2015_INDICATORS, computeCmoSubmissionTotals } from './cmo-2015-indicators';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface SyncActionPlanToGadParams {
  firestore: any;
  planId: string;
  qomId: string;
  opItemId?: string;
  unitId: string;
  unitName?: string;
  campusId: string;
  year: number;
  objectiveText: string;
  taskText: string;
  targetIndicator: string;
  responsiblePerson: string;
  inCharge?: string;
  hasGadComponent: boolean;
  gadCategory?: GADCategory;
  gadPillar?: GADMainstreamingPillar;
  cmoIndicatorId?: number;
  genderIssue?: string;
  causeOfIssue?: string;
  gadObjective?: string;
  gadActivityName?: string;
  gadBudget?: number;
  gadOriginalProgramBudget?: number;
  hgdgScore?: number;
  psCost?: number;
  mooeCost?: number;
  coCost?: number;
  sourceOfBudget?: string;
  gadTargetBeneficiaries?: {
    male: number;
    female: number;
  };
  existingGadPlanId?: string;
}

export function getDeterministicGadPlanId(qomId: string, existingGadPlanId?: string): string {
  if (existingGadPlanId) return existingGadPlanId;
  return `eoms_gpb_${qomId}`;
}

export function getDeterministicGadActivityId(qomId: string, month: number): string {
  return `eoms_act_${qomId}_m${month}`;
}

/**
 * Synchronizes an Action Plan / Program row from the Unit EOMS Digital Document
 * ("Action Plans / Programs Monitoring Matrix") into the `gadPlans` (GPB) collection.
 */
export async function syncActionPlanToGadPlan(params: SyncActionPlanToGadParams): Promise<string | null> {
  const {
    firestore,
    planId,
    qomId,
    opItemId,
    unitId,
    unitName,
    campusId,
    year,
    objectiveText,
    taskText,
    targetIndicator,
    responsiblePerson,
    inCharge,
    hasGadComponent,
    gadCategory = 'CLIENT-FOCUSED ACTIVITIES',
    gadPillar = 'CURRICULUM',
    cmoIndicatorId,
    genderIssue,
    causeOfIssue,
    gadObjective,
    gadActivityName,
    gadBudget = 0,
    gadOriginalProgramBudget = 0,
    hgdgScore = 0,
    psCost = 0,
    mooeCost = 0,
    coCost = 0,
    sourceOfBudget = 'GAA',
    gadTargetBeneficiaries,
    existingGadPlanId,
  } = params;

  if (!firestore || !unitId || !qomId) return null;

  const gadPlanId = getDeterministicGadPlanId(qomId, existingGadPlanId);
  const gadPlanRef = doc(firestore, 'gadPlans', gadPlanId);

  if (!hasGadComponent) {
    // If previously synced from EOMS Matrix, clean up the auto-synced GPB record when unchecked
    if (gadPlanId.startsWith('eoms_gpb_')) {
      try {
        const snap = await getDoc(gadPlanRef);
        if (snap.exists() && snap.data()?.isSyncedFromEomsMatrix) {
          await deleteDoc(gadPlanRef);
        }
      } catch (err) {
        console.warn('Could not clean up unlinked GAD Plan:', err);
      }
    }
    return null;
  }

  const itemizedSum = (Number(psCost) || 0) + (Number(mooeCost) || 0) + (Number(coCost) || 0);
  const hgdgAttributionRate =
    gadCategory === 'ATTRIBUTED PROGRAM' ? calculateHgdgAttributionRate(Number(hgdgScore) || 0) : 1;

  let computedBudget = Number(gadBudget) || 0;
  if (gadCategory === 'ATTRIBUTED PROGRAM' && Number(gadOriginalProgramBudget) > 0) {
    computedBudget = Number((Number(gadOriginalProgramBudget) * hgdgAttributionRate).toFixed(2));
  } else if (itemizedSum > 0) {
    computedBudget = itemizedSum;
  }

  const cmoDescriptor = cmoIndicatorId ? CMO_2015_INDICATORS.find((i) => i.id === Number(cmoIndicatorId)) : undefined;

  const defaultGenderIssue =
    genderIssue?.trim() ||
    (cmoDescriptor
      ? `CMO No. 1, s. 2015 Mandate (Descriptor #${cmoDescriptor.itemCode}): ${cmoDescriptor.title}`
      : `Gender mainstreaming in unit deliverable: ${taskText}`);

  const defaultCause =
    causeOfIssue?.trim() ||
    'Need for systematic gender integration and Sex-Disaggregated Data (SDD) tracking in unit programs and services under CMO No. 1, s. 2015.';

  const defaultGadObjective =
    gadObjective?.trim() ||
    `To ensure gender-responsive delivery and equitable male/female participation in: ${objectiveText || taskText}`;

  const targetSummary =
    gadTargetBeneficiaries && (gadTargetBeneficiaries.male > 0 || gadTargetBeneficiaries.female > 0)
      ? `${targetIndicator || taskText} (Target SDD: ${gadTargetBeneficiaries.male} Male, ${gadTargetBeneficiaries.female} Female)`
      : targetIndicator || taskText;

  const gadPlanPayload: Record<string, any> = {
    id: gadPlanId,
    year: Number(year),
    unitId,
    campusId: campusId || '',
    genderIssue: defaultGenderIssue,
    causeOfIssue: defaultCause,
    objective: defaultGadObjective,
    pap: objectiveText || taskText,
    gadActivityName: gadActivityName?.trim() || taskText,
    performanceIndicators: targetIndicator || `100% implementation of ${taskText} with SDD monitoring`,
    targets: targetSummary,
    budget: computedBudget,
    originalProgramBudget: Number(gadOriginalProgramBudget) || computedBudget,
    psCost: Number(psCost) || 0,
    mooeCost: Number(mooeCost) || computedBudget,
    coCost: Number(coCost) || 0,
    sourceOfBudget: sourceOfBudget || 'GAA',
    responsibleOffice: inCharge || responsiblePerson || unitName || 'Assigned Unit',
    status: 'Finalized',
    category: gadCategory,
    gadPillar,
    cmoIndicatorId: cmoIndicatorId ? Number(cmoIndicatorId) : null,
    hgdgScore: gadCategory === 'ATTRIBUTED PROGRAM' ? Number(hgdgScore) || 0 : null,
    hgdgAttributionRate: gadCategory === 'ATTRIBUTED PROGRAM' ? hgdgAttributionRate : null,
    targetBeneficiaries: gadTargetBeneficiaries || { male: 0, female: 0 },
    isSyncedFromEomsMatrix: true,
    sourcePlanId: planId,
    sourceOpItemId: opItemId || '',
    sourceQomId: qomId,
    updatedAt: serverTimestamp(),
  };

  const existingSnap = await getDoc(gadPlanRef);
  if (!existingSnap.exists()) {
    gadPlanPayload.createdAt = serverTimestamp();
    gadPlanPayload.implementationStatus = 'On-going';
  }

  await setDoc(gadPlanRef, gadPlanPayload, { merge: true });
  return gadPlanId;
}

export interface SyncMonthlyLogToGadParams {
  firestore: any;
  planId: string;
  qomId: string;
  opItemId?: string;
  unitId: string;
  unitName?: string;
  campusId: string;
  year: number;
  month: number; // 1 - 12
  objectiveText: string;
  taskText: string;
  targetIndicator: string;
  responsiblePerson: string;
  inCharge?: string;
  // Monthly accomplishment fields
  implemented: boolean;
  output: string;
  notes: string;
  evidenceLink?: string;
  evidenceName?: string;
  reportedBy?: string;
  // GAD fields from monthly dialog or parent item
  hasGadComponent: boolean;
  maleParticipants: number;
  femaleParticipants: number;
  sectorBreakdown?: Partial<Record<GADSector, { male: number; female: number }>>;
  gadActualCost?: number;
  gadVarianceRemarks?: string;
  gadCategory?: GADCategory;
  gadPillar?: GADMainstreamingPillar;
  cmoIndicatorId?: number;
  genderIssue?: string;
  causeOfIssue?: string;
  gadObjective?: string;
  gadBudget?: number;
  existingGadPlanId?: string;
  allMonthlyAccomplishments?: Record<number, MonthlyAccomplishmentEntry>;
}

/**
 * Synchronizes a Monthly Accomplishment Log ("Log Actual Accomplishment" dialog in the
 * Action Plans / Programs Monitoring Matrix) with the GAD Corner:
 * 1. Ensures the parent Action Plan has a synced `gadPlans` (GPB) record.
 * 2. Upserts the monthly `gadActivities` record with Male/Female SDD & 7 Sectors so SDD Hub & Event Registry update immediately.
 * 3. Updates the parent `gadPlans` cumulative Actual Result, SDD total, Actual Cost, and Implementation Status for the GAD Accomplishment Report.
 * 4. If linked to a CMO No. 1, s. 2015 Descriptor (#1–20) and an `evidenceLink` is provided, registers the MOV in `cmoSubmissions` / `cmoMovRecords`.
 */
export async function syncMonthlyLogToGadCorner(params: SyncMonthlyLogToGadParams): Promise<{
  gadPlanId: string | null;
  gadActivityId: string | null;
}> {
  const {
    firestore,
    planId,
    qomId,
    opItemId,
    unitId,
    unitName,
    campusId,
    year,
    month,
    objectiveText,
    taskText,
    targetIndicator,
    responsiblePerson,
    inCharge,
    implemented,
    output,
    notes,
    evidenceLink,
    evidenceName,
    reportedBy,
    hasGadComponent,
    maleParticipants,
    femaleParticipants,
    sectorBreakdown = {},
    gadActualCost = 0,
    gadVarianceRemarks = '',
    gadCategory = 'CLIENT-FOCUSED ACTIVITIES',
    gadPillar = 'CURRICULUM',
    cmoIndicatorId,
    genderIssue,
    causeOfIssue,
    gadObjective,
    gadBudget = 0,
    existingGadPlanId,
    allMonthlyAccomplishments = {},
  } = params;

  if (!firestore || !unitId || !qomId) {
    return { gadPlanId: null, gadActivityId: null };
  }

  const gadActivityId = getDeterministicGadActivityId(qomId, month);
  const gadActivityRef = doc(firestore, 'gadActivities', gadActivityId);

  if (!hasGadComponent) {
    // If the user unchecked Gender Component for this month, remove any auto-synced activity for this month
    try {
      const snap = await getDoc(gadActivityRef);
      if (snap.exists() && snap.data()?.isSyncedFromEomsMatrix) {
        await deleteDoc(gadActivityRef);
      }
    } catch (err) {
      console.warn('Failed to clean up GAD activity for month:', err);
    }
    return { gadPlanId: existingGadPlanId || null, gadActivityId: null };
  }

  // 1. Ensure parent GPB (`gadPlans`) record exists
  const gadPlanId = await syncActionPlanToGadPlan({
    firestore,
    planId,
    qomId,
    opItemId,
    unitId,
    unitName,
    campusId,
    year,
    objectiveText,
    taskText,
    targetIndicator,
    responsiblePerson,
    inCharge,
    hasGadComponent: true,
    gadCategory,
    gadPillar,
    cmoIndicatorId,
    genderIssue,
    causeOfIssue,
    gadObjective,
    gadBudget: gadBudget || gadActualCost || 0,
    existingGadPlanId,
  });

  // 2. Upsert the monthly `gadActivities` record with Male/Female SDD & Sectors
  const monthLabel = MONTH_NAMES[(month - 1) % 12] || `Month ${month}`;
  const activityDate = Timestamp.fromDate(new Date(Number(year), month - 1, 15));
  const maleCount = Math.max(0, Number(maleParticipants) || 0);
  const femaleCount = Math.max(0, Number(femaleParticipants) || 0);
  const actualCostNum = Math.max(0, Number(gadActualCost) || 0);

  const implStatus: GADImplementationStatus = implemented ? 'Done' : 'On-going';

  const activityPayload: Record<string, any> = {
    id: gadActivityId,
    activityId: `EOMS-GAD-${year}-${String(month).padStart(2, '0')}-${qomId.slice(-4).toUpperCase()}`,
    activityName: `${taskText} (${monthLabel} ${year})`,
    date: activityDate,
    year: Number(year),
    implementingUnitId: unitId,
    campusId: campusId || '',
    participants: {
      male: maleCount,
      female: femaleCount,
      sectors: sectorBreakdown || {},
    },
    planId: gadPlanId || undefined,
    actualBudgetUsed: actualCostNum,
    psCost: 0,
    mooeCost: actualCostNum,
    coCost: 0,
    actualOutput:
      output?.trim() ||
      notes?.trim() ||
      `Implemented in ${monthLabel} ${year} (${maleCount} Male, ${femaleCount} Female participants)`,
    varianceAnalysis: gadVarianceRemarks?.trim() || notes?.trim() || '',
    implementationStatus: implStatus,
    driveLink: evidenceLink?.trim() || '',
    deviceFingerprint: 'eoms-matrix-sync',
    isSyncedFromEomsMatrix: true,
    sourcePlanId: planId,
    sourceOpItemId: opItemId || '',
    sourceQomId: qomId,
    sourceMonth: month,
    cmoIndicatorId: cmoIndicatorId ? Number(cmoIndicatorId) : null,
    gadPillar,
    gadCategory,
    updatedAt: serverTimestamp(),
  };

  const existingActSnap = await getDoc(gadActivityRef);
  if (!existingActSnap.exists()) {
    activityPayload.createdAt = serverTimestamp();
  }

  await setDoc(gadActivityRef, activityPayload, { merge: true });

  // 3. Roll up cumulative YTD accomplishments across all months into the parent `gadPlans` record (for GAD AR)
  if (gadPlanId) {
    let totalMale = 0;
    let totalFemale = 0;
    let totalActualCost = 0;
    const monthlyOutputs: string[] = [];
    let latestDriveLink = evidenceLink?.trim() || '';

    const mergedMonths: Record<number, MonthlyAccomplishmentEntry> = {
      ...allMonthlyAccomplishments,
      [month]: {
        ...(allMonthlyAccomplishments[month] || {}),
        implemented,
        output,
        notes,
        evidenceLink,
        hasGadComponent: true,
        gadParticipants: {
          male: maleCount,
          female: femaleCount,
          sectors: sectorBreakdown,
        },
        gadActualCost: actualCostNum,
        gadVarianceRemarks,
        gadActivityId,
      },
    };

    Object.entries(mergedMonths).forEach(([mKey, entry]) => {
      if (!entry) return;
      const mNum = Number(mKey);
      const mName = MONTH_NAMES[(mNum - 1) % 12] || `M${mNum}`;
      const pMale = Number(entry.gadParticipants?.male) || 0;
      const pFemale = Number(entry.gadParticipants?.female) || 0;
      totalMale += pMale;
      totalFemale += pFemale;
      totalActualCost += Number(entry.gadActualCost) || 0;
      if (entry.implemented || pMale > 0 || pFemale > 0 || entry.output) {
        const summaryPart = entry.output || entry.notes || 'Implemented';
        monthlyOutputs.push(`${mName}: ${summaryPart} (${pMale}M / ${pFemale}F)`);
      }
      if (entry.evidenceLink && !latestDriveLink) {
        latestDriveLink = entry.evidenceLink;
      }
    });

    const gadPlanRef = doc(firestore, 'gadPlans', gadPlanId);
    await setDoc(
      gadPlanRef,
      {
        implementationStatus: implemented ? 'Done' : 'On-going',
        actualResult:
          monthlyOutputs.join(' | ') || `${output || taskText} (Total SDD: ${totalMale} Male, ${totalFemale} Female)`,
        actualCost: totalActualCost,
        varianceRemarks: gadVarianceRemarks?.trim() || notes?.trim() || '',
        driveLink: latestDriveLink,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  // 4. If linked to a CMO No. 1, s. 2015 Descriptor (#1-20) and an evidenceLink is provided, auto-register in `cmoMovRecords` & `cmoSubmissions`
  if (cmoIndicatorId && Number(cmoIndicatorId) >= 1 && Number(cmoIndicatorId) <= 20 && evidenceLink?.trim()) {
    try {
      const indId = Number(cmoIndicatorId);
      const submissionId = `${unitId}_${year}`;
      const movId = `mov_${qomId}_m${month}_ind${indId}`;
      const movRecord: CMOMovRecord = {
        id: movId,
        submissionId,
        indicatorId: indId,
        unitId,
        campusId: campusId || '',
        year: Number(year),
        movType: 'PRIMARY',
        documentCategory: `EOMS Action Plan Matrix (${monthLabel} ${year})`,
        fileName:
          evidenceName?.trim() || `${taskText} — ${monthLabel} ${year} Accomplishment (${maleCount}M/${femaleCount}F)`,
        fileUrl: evidenceLink.trim(),
        sourceType: 'EOMS_MATRIX_SYNC',
        sourceOpItemId: opItemId || '',
        sourceQomId: qomId,
        uploadedBy: reportedBy || responsiblePerson || 'Unit EOMS Focal',
        uploadedByName: reportedBy || responsiblePerson || 'Unit EOMS Focal',
        uploadedAt: new Date().toISOString(),
      };

      const movRef = doc(firestore, 'cmoMovRecords', movId);
      await setDoc(movRef, movRecord, { merge: true });

      // Also ensure the unit's `cmoSubmissions` document links this MOV and defaults to at least PARTIAL if currently unset/NO
      const subRef = doc(firestore, 'cmoSubmissions', submissionId);
      const subSnap = await getDoc(subRef);
      const existingSub = subSnap.exists() ? (subSnap.data() as CMOSubmission) : null;
      const existingItems = { ...(existingSub?.items || {}) };
      const currentItem = existingItems[indId];

      if (!currentItem || !currentItem.selfResponse || currentItem.selfResponse === 'NO') {
        const indDef = CMO_2015_INDICATORS.find((i) => i.id === indId);
        const partialScore = indDef?.scoringRubric.PARTIAL.score ?? 0.5;
        existingItems[indId] = {
          indicatorId: indId,
          selfResponse: 'PARTIAL',
          selfScore: partialScore,
          selfRemarks: `Auto-synced from Unit EOMS Action Plan Matrix: ${taskText} (${maleCount} Male, ${femaleCount} Female beneficiaries).`,
          updatedAt: new Date().toISOString(),
        };
      }

      const existingMovs = (existingSub?.movs || []).filter((m) => m.id !== movId);
      existingMovs.push(movRecord);
      const totals = computeCmoSubmissionTotals(existingItems);

      await setDoc(
        subRef,
        {
          id: submissionId,
          unitId,
          unitName: unitName || existingSub?.unitName || '',
          campusId: campusId || existingSub?.campusId || '',
          year: Number(year),
          status: existingSub?.status || 'DRAFT',
          items: existingItems,
          movs: existingMovs,
          ...totals,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn('Could not auto-link MOV to CMO 1 s. 2015 submission:', err);
    }
  }

  return { gadPlanId, gadActivityId };
}
