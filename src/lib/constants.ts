
/**
 * @fileOverview Centralized constants for the RSU EOMS Framework.
 * Moving these here prevents circular dependencies between Pages and Components.
 */

import type { KpiCategory, KpiThreshold } from './types';

export const TOTAL_REPORTS_PER_CYCLE = 6;
export const TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT = TOTAL_REPORTS_PER_CYCLE * 2; 

export const submissionTypes = [
  'SWOT Analysis',
  'Needs and Expectation of Interested Parties',
  'Operational Plan',
  'Quality Objectives Monitoring',
  'Risk and Opportunity Registry',
  'Risk and Opportunity Action Plan'
];

// KPI & OKR Constants
export const KPI_CATEGORIES: Record<KpiCategory, string> = {
  eoms_compliance: 'EOMS Compliance',
  risk_management: 'Risk Management',
  audit_car: 'Audit & CAR',
  academic_programs: 'Academic Programs',
  gad: 'Gender & Development',
  csm_service_quality: 'CSM & Service Quality',
  system_operations: 'System Operations',
  faculty_evaluation: 'Faculty Evaluation',
};

export const KPI_STATUS_LABELS: Record<string, string> = {
  good: 'Good',
  satisfactory: 'Satisfactory',
  poor: 'Poor',
};

export const KPI_STATUS_COLORS: Record<string, string> = {
  good: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  satisfactory: 'text-amber-600 bg-amber-50 border-amber-200',
  poor: 'text-rose-600 bg-rose-50 border-rose-200',
};

export const OKR_QUARTERS = [1, 2, 3, 4] as const;

export const OKR_ENTITY_TYPES = ['institution', 'campus', 'unit', 'individual'] as const;

export const OKR_STATUSES = ['draft', 'active', 'completed', 'archived'] as const;

export const KR_TYPES = ['metric', 'binary', 'milestone'] as const;

export const DEFAULT_KPI_THRESHOLDS: KpiThreshold = {
  good: 80,
  satisfactory: 60,
  poor: 40,
  direction: 'higher_is_better',
};

export const KPI_ENTITY_TYPES = ['institution', 'campus', 'unit'] as const;

export const KPI_ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
