import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const KPI_DEFINITIONS = [
  {
    name: 'Submission Completion Rate',
    description: 'Percentage of units that have submitted all required reports for the cycle.',
    category: 'eoms_compliance',
    formula: 'submission_completion_rate',
    dataSource: 'submission_completion_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 50, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Submission On-Time Rate',
    description: 'Percentage of submissions completed before the cycle deadline.',
    category: 'eoms_compliance',
    formula: 'submission_on_time_rate',
    dataSource: 'submission_on_time_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 50, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Submission Approval Rate',
    description: 'Percentage of submissions that have been approved.',
    category: 'eoms_compliance',
    formula: 'submission_approval_rate',
    dataSource: 'submission_approval_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 50, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Risk Closure Rate',
    description: 'Percentage of identified risks that have been closed.',
    category: 'risk_management',
    formula: 'risk_closure_rate',
    dataSource: 'risk_closure_rate',
    unit: '%',
    thresholds: { good: 85, satisfactory: 65, poor: 40, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
  {
    name: 'High Risk Percentage',
    description: 'Percentage of risks rated as high or critical. Lower is better.',
    category: 'risk_management',
    formula: 'high_risk_percentage',
    dataSource: 'high_risk_percentage',
    unit: '%',
    thresholds: { good: 10, satisfactory: 20, poor: 35, direction: 'lower_is_better' },
    defaultTarget: 10,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Risk Overdue Ratio',
    description: 'Percentage of open risks past their target closure date. Lower is better.',
    category: 'risk_management',
    formula: 'risk_overdue_ratio',
    dataSource: 'risk_overdue_ratio',
    unit: '%',
    thresholds: { good: 10, satisfactory: 20, poor: 35, direction: 'lower_is_better' },
    defaultTarget: 10,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Risk Treatment Effectiveness',
    description: 'Percentage of risk treatments that successfully reduced risk magnitude.',
    category: 'risk_management',
    formula: 'risk_treatment_effectiveness',
    dataSource: 'risk_treatment_effectiveness',
    unit: '%',
    thresholds: { good: 85, satisfactory: 65, poor: 40, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
  {
    name: 'CAR Closure Rate',
    description: 'Percentage of Corrective Action Requests that have been closed.',
    category: 'audit_car',
    formula: 'car_closure_rate',
    dataSource: 'car_closure_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 70, poor: 45, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Audit Completion Rate',
    description: 'Percentage of scheduled audits that have been completed with a closing meeting.',
    category: 'audit_car',
    formula: 'audit_completion_rate',
    dataSource: 'audit_completion_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 70, poor: 45, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'CSM Client Satisfaction Score',
    description: 'Average client satisfaction score from CSM surveys, converted to percentage.',
    category: 'csm_service_quality',
    formula: 'csm_satisfaction_score',
    dataSource: 'csm_satisfaction_score',
    unit: '%',
    thresholds: { good: 85, satisfactory: 65, poor: 40, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
  {
    name: 'GAD Budget Utilization',
    description: 'Percentage of allocated GAD budget that has been utilized.',
    category: 'gad',
    formula: 'gad_budget_utilization',
    dataSource: 'gad_budget_utilization',
    unit: '%',
    thresholds: { good: 85, satisfactory: 60, poor: 35, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
];

export async function GET() {
  try {
    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    const col = firestore.collection('kpiDefinitions');
    const existing = await col.limit(1).get();

    if (!existing.empty) {
      const countSnap = await col.count().get();
      return NextResponse.json({ message: `Already seeded (${countSnap.data().count} docs exist)`, count: countSnap.data().count });
    }

    const batch = firestore.batch();
    const now = Timestamp.now();
    for (const kpi of KPI_DEFINITIONS) {
      const ref = col.doc();
      batch.set(ref, { ...kpi, createdAt: now, updatedAt: now });
    }
    await batch.commit();

    return NextResponse.json({ message: `Seeded ${KPI_DEFINITIONS.length} KPI definitions`, count: KPI_DEFINITIONS.length });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
