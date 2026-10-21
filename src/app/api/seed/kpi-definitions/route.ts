import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/firebase/admin';
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
  {
    name: 'Program Accreditation',
    description: 'Percentage of academic programs meeting accredited maturity status and quality recommendations.',
    category: 'program_accreditation',
    formula: 'program_accreditation',
    dataSource: 'Program Accreditation',
    unit: '%',
    thresholds: { good: 85, satisfactory: 65, poor: 40, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
  {
    name: 'COPC Issuance Rate',
    description:
      'Percentage of active academic programs with an issued Certificate of Program Compliance (COPC) from CHED.',
    category: 'academic_programs',
    formula: 'copc_issuance_rate',
    dataSource: 'copc_issuance_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 60, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Procedure Manual Currency Rate',
    description:
      'Percentage of organizational units maintaining updated, compliant procedure manuals conforming to ISO 21001 Clause 7.5.',
    category: 'eoms_compliance',
    formula: 'procedure_manual_currency_rate',
    dataSource: 'procedure_manual_currency_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 55, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Submission Link Accessibility Rate',
    description:
      'Percentage of submitted reports with accessible, valid Google Drive repository links conforming to sharing protocols.',
    category: 'system_operations',
    formula: 'submission_link_accessibility_rate',
    dataSource: 'submission_link_accessibility_rate',
    unit: '%',
    thresholds: { good: 98, satisfactory: 90, poor: 80, direction: 'higher_is_better' },
    defaultTarget: 98,
    weight: 1,
    isActive: true,
  },
  {
    name: 'OFI Implementation Rate',
    description:
      'Percentage of internal quality audit Opportunities for Improvement (OFI) that have been successfully verified and implemented.',
    category: 'audit_car',
    formula: 'ofi_implementation_rate',
    dataSource: 'ofi_implementation_rate',
    unit: '%',
    thresholds: { good: 80, satisfactory: 65, poor: 50, direction: 'higher_is_better' },
    defaultTarget: 80,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Opportunity Realization Rate',
    description:
      'Percentage of strategic opportunities identified in the ROR registry that have been completed and realized.',
    category: 'risk_management',
    formula: 'opportunity_realization_rate',
    dataSource: 'opportunity_realization_rate',
    unit: '%',
    thresholds: { good: 75, satisfactory: 60, poor: 40, direction: 'higher_is_better' },
    defaultTarget: 75,
    weight: 1,
    isActive: true,
  },
];

export async function GET(req: NextRequest) {
  try {
    const auth = getAdminAuth();
    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    // Require authorization: either a valid Admin Bearer token or ADMIN_SEED_SECRET
    const authHeader = req.headers.get('authorization');
    const secretParam = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.ADMIN_SEED_SECRET;

    let isAuthorized = false;
    if (expectedSecret && secretParam === expectedSecret) {
      isAuthorized = true;
    } else if (auth && authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decoded = await auth.verifyIdToken(idToken);
        const userDoc = await firestore.collection('users').doc(decoded.uid).get();
        const role = userDoc.data()?.role;
        if (role === 'Admin' || role === 'Super Admin' || decoded.email === 'admin@eoms.com') {
          isAuthorized = true;
        }
      } catch {
        // invalid token
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Admin credentials or valid seed secret required.' },
        { status: 403 },
      );
    }

    const col = firestore.collection('kpiDefinitions');
    const existingSnap = await col.get();
    const existingSources = new Set<string>();
    existingSnap.forEach((doc) => {
      const data = doc.data();
      if (data.dataSource) existingSources.add(data.dataSource);
    });

    const missingKpis = KPI_DEFINITIONS.filter((k) => !existingSources.has(k.dataSource));

    if (missingKpis.length === 0) {
      return NextResponse.json({
        message: `All KPI definitions are already present (${existingSnap.size} docs exist)`,
        count: existingSnap.size,
      });
    }

    const batch = firestore.batch();
    const now = Timestamp.now();
    for (const kpi of missingKpis) {
      const ref = col.doc();
      batch.set(ref, { ...kpi, createdAt: now, updatedAt: now });
    }
    await batch.commit();

    return NextResponse.json({
      message: `Seeded ${missingKpis.length} new KPI definition(s). Total: ${existingSnap.size + missingKpis.length}`,
      newlyAdded: missingKpis.length,
      totalCount: existingSnap.size + missingKpis.length,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
