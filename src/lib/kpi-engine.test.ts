import { describe, it, expect } from 'vitest';
import { computeKpis, computeEomsScore } from './kpi-engine';
import type {
  KpiDefinition,
  Submission,
  Risk,
  ProcedureManual,
  AuditFinding,
  ProgramComplianceRecord,
  Unit,
} from './types';

describe('KPI Engine - Phase 1 KPIs', () => {
  const baseDef = (dataSource: string, name: string): KpiDefinition => ({
    id: `def_${dataSource}`,
    name,
    description: `Test description for ${name}`,
    category: 'eoms_compliance',
    formula: dataSource,
    dataSource,
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 50, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('computes COPC Issuance Rate correctly', () => {
    const def = baseDef('copc_issuance_rate', 'COPC Issuance Rate');
    def.category = 'academic_programs';

    const compliances: Partial<ProgramComplianceRecord>[] = [
      { id: 'c1', academicYear: 2026, ched: { copcStatus: 'With COPC' } },
      { id: 'c2', academicYear: 2026, ched: { copcStatus: 'In Progress' } },
      { id: 'c3', academicYear: 2026, ched: { copcStatus: 'With COPC' } },
      { id: 'c4', academicYear: 2026, ched: { copcStatus: 'No COPC' } },
    ];

    const snapshots = computeKpis({
      definitions: [def],
      programCompliances: compliances as ProgramComplianceRecord[],
      selectedYear: 2026,
      entityType: 'institution',
      entityId: 'inst_1',
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].value).toBe(50); // 2 of 4
    expect(snapshots[0].status).toBe('poor'); // 50% is below satisfactory threshold (75%)
  });

  it('computes Procedure Manual Currency Rate correctly', () => {
    const def = baseDef('procedure_manual_currency_rate', 'Procedure Manual Currency Rate');

    const manuals: Partial<ProcedureManual>[] = [
      { id: 'u1', unitName: 'Unit 1', status: 'Updated' },
      { id: 'u2', unitName: 'Unit 2', status: 'Needs Revision' },
      { id: 'u3', unitName: 'Unit 3', status: 'Updated' },
      { id: 'u4', unitName: 'Unit 4', status: 'Updated' },
    ];

    const snapshots = computeKpis({
      definitions: [def],
      procedureManuals: manuals as ProcedureManual[],
      selectedYear: 2026,
      entityType: 'institution',
      entityId: 'inst_1',
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].value).toBe(75); // 3 of 4
    expect(snapshots[0].status).toBe('satisfactory');
  });

  it('computes Submission Link Accessibility Rate correctly', () => {
    const def = baseDef('submission_link_accessibility_rate', 'Submission Link Accessibility Rate');
    def.category = 'system_operations';

    const submissions: Partial<Submission>[] = [
      {
        id: 's1',
        year: 2026,
        googleDriveLink: 'https://drive.google.com/drive/folders/1ABC_valid_link',
      },
      {
        id: 's2',
        year: 2026,
        googleDriveLink: 'https://drive.google.com/file/d/1XYZ/view',
      },
      {
        id: 's3',
        year: 2026,
        googleDriveLink: 'https://invalid-external-site.com/docs',
      },
      {
        id: 's4',
        year: 2026,
        googleDriveLink: '',
      },
    ];

    const snapshots = computeKpis({
      definitions: [def],
      submissions: submissions as Submission[],
      selectedYear: 2026,
      entityType: 'institution',
      entityId: 'inst_1',
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].value).toBe(50); // 2 of 4
  });

  it('computes OFI Implementation Rate correctly', () => {
    const def = baseDef('ofi_implementation_rate', 'OFI Implementation Rate');
    def.category = 'audit_car';

    const findings: Partial<AuditFinding>[] = [
      {
        id: 'f1',
        type: 'Observation for Improvement',
        description: 'Improve document indexing',
        verification: { status: 'Implemented', verifiedBy: 'user_1', verifiedAt: new Date() },
      },
      {
        id: 'f2',
        type: 'Observation for Improvement',
        description: 'Update signage',
        verification: { status: 'Carried Forward', verifiedBy: 'user_1', verifiedAt: new Date() },
      },
      {
        id: 'f3',
        type: 'Non-Conformance', // Should be excluded from OFI calculation
        description: 'Missing signature',
      },
    ];

    const snapshots = computeKpis({
      definitions: [def],
      auditFindings: findings as AuditFinding[],
      selectedYear: 2026,
      entityType: 'institution',
      entityId: 'inst_1',
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].value).toBe(50); // 1 of 2 OFIs implemented
  });

  it('computes Opportunity Realization Rate correctly', () => {
    const def = baseDef('opportunity_realization_rate', 'Opportunity Realization Rate');
    def.category = 'risk_management';

    const risks: Partial<Risk>[] = [
      {
        id: 'r1',
        year: 2026,
        type: 'Opportunity',
        description: 'Leverage new grant',
        status: 'Closed',
      },
      {
        id: 'r2',
        year: 2026,
        type: 'Opportunity',
        description: 'International partnership',
        status: 'In Progress',
      },
      {
        id: 'r3',
        year: 2026,
        type: 'Risk', // Hazard risk, excluded
        description: 'Server outage',
        status: 'Closed',
      },
    ];

    const snapshots = computeKpis({
      definitions: [def],
      risks: risks as Risk[],
      selectedYear: 2026,
      entityType: 'institution',
      entityId: 'inst_1',
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].value).toBe(50); // 1 of 2 opportunities closed
  });

  it('filters campus entity properly for procedure manuals and compliances', () => {
    const copcDef = baseDef('copc_issuance_rate', 'COPC Issuance Rate');
    const manualDef = baseDef('procedure_manual_currency_rate', 'Procedure Manual Currency Rate');

    const units: Partial<Unit>[] = [
      { id: 'u1', name: 'Main CET', campusIds: ['campus_main'] },
      { id: 'u2', name: 'Branch CAS', campusIds: ['campus_branch'] },
    ];

    const manuals: Partial<ProcedureManual>[] = [
      { id: 'u1', unitName: 'Main CET', status: 'Updated' },
      { id: 'u2', unitName: 'Branch CAS', status: 'Needs Revision' },
    ];

    const compliances: Partial<ProgramComplianceRecord>[] = [
      { id: 'c1', campusId: 'campus_main', academicYear: 2026, ched: { copcStatus: 'With COPC' } },
      { id: 'c2', campusId: 'campus_branch', academicYear: 2026, ched: { copcStatus: 'No COPC' } },
    ];

    const snapshots = computeKpis({
      definitions: [copcDef, manualDef],
      units: units as Unit[],
      procedureManuals: manuals as ProcedureManual[],
      programCompliances: compliances as ProgramComplianceRecord[],
      selectedYear: 2026,
      entityType: 'campus',
      entityId: 'campus_main',
    });

    const copcSnap = snapshots.find((s) => s.kpiId === copcDef.id);
    const manualSnap = snapshots.find((s) => s.kpiId === manualDef.id);

    expect(copcSnap?.value).toBe(100); // 1 of 1 for campus_main
    expect(manualSnap?.value).toBe(100); // 1 of 1 for campus_main (mapped via unit)
  });
});
