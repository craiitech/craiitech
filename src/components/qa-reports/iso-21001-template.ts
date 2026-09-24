import type { MRAgendaPart, MRAttendee } from '@/lib/types';

export const ISO_21001_CLAUSE_INPUTS = [
  {
    partNumber: 1,
    title: 'Status of Actions from Previous Management Reviews',
    clause: 'ISO 21001:2018 Clause 9.3.2.a',
    description:
      'Review of actionable decisions, nonconformity status, closure verifications, and progress from the prior Management Review cycle.',
    suggestedReporter: 'Quality Assurance Director / Lead Internal Auditor',
    durationMinutes: 30,
  },
  {
    partNumber: 2,
    title: 'External and Internal Context & Strategic Alignment',
    clause: 'ISO 21001:2018 Clause 9.3.2.b',
    description:
      'Changes in statutory, regulatory (CHED/DepEd/PRC), technological, community, and economic factors impacting the EOMS and organizational vision.',
    suggestedReporter: 'Planning and Development Office / University President',
    durationMinutes: 30,
  },
  {
    partNumber: 3,
    title: 'Learner & Other Beneficiary Satisfaction and Feedback',
    clause: 'ISO 21001:2018 Clause 9.3.2.c.1 & 9.3.2.h',
    description:
      'Student teaching evaluations, alumni tracer surveys, complaints/grievance resolution, employer feedback, and accessibility/special educational needs accommodations.',
    suggestedReporter: 'Student Affairs and Services / Guidance and Testing Center',
    durationMinutes: 45,
  },
  {
    partNumber: 4,
    title: 'Extent to Which Educational & Quality Objectives Have Been Met',
    clause: 'ISO 21001:2018 Clause 9.3.2.c.2',
    description:
      'KPI scorecard evaluation, Major Final Outputs (MFOs), PREXC targets, academic performance indicators, and institutional operational plans.',
    suggestedReporter: 'Quality Assurance Office / Planning Directorate',
    durationMinutes: 40,
  },
  {
    partNumber: 5,
    title: 'Process Performance & Educational Products/Services Conformity',
    clause: 'ISO 21001:2018 Clause 9.3.2.c.3',
    description:
      'Curricular delivery adherence, instructional reviews, admissions, enrollment trends, retention rates, graduation statistics, and extension services.',
    suggestedReporter: 'Vice President for Academic Affairs & Deans Council',
    durationMinutes: 45,
  },
  {
    partNumber: 6,
    title: 'Nonconformities, CARs, and Internal/External Audit Results',
    clause: 'ISO 21001:2018 Clause 9.3.2.c.4 & 9.3.2.c.6',
    description:
      'Internal Quality Audits (IQA), External Quality Audits (EQA), accreditation milestones, Corrective Action Requests (CARs), and Opportunities for Improvement (OFIs).',
    suggestedReporter: 'Lead Internal Quality Auditor / IQA Committee',
    durationMinutes: 40,
  },
  {
    partNumber: 7,
    title: 'Learning Assessment Outcomes & External Provider Performance',
    clause: 'ISO 21001:2018 Clause 9.3.2.c.7 & 9.3.2.c.8',
    description:
      'Licensure board examination passing rates, formative/summative learner metrics, and evaluation of suppliers, contractors, industry partners, and outsourced services.',
    suggestedReporter: 'Academic Council / Procurement and Supply Office',
    durationMinutes: 30,
  },
  {
    partNumber: 8,
    title: 'Adequacy of Resources & Staff Pedagogical Competence',
    clause: 'ISO 21001:2018 Clause 9.3.2.d & 9.3.2.g',
    description:
      'Physical infrastructure, laboratories, digital learning platforms, IT systems, budget utilization, faculty development, research grants, and personnel upskilling.',
    suggestedReporter: 'Vice President for Administration and Finance / HRMO',
    durationMinutes: 40,
  },
  {
    partNumber: 9,
    title: 'Effectiveness of Actions on Risks and Opportunities',
    clause: 'ISO 21001:2018 Clause 9.3.2.e',
    description:
      'Review of the Institutional Risk Management Register, mitigation efficacy, emerging academic/operational risks, and strategic opportunity exploitation.',
    suggestedReporter: 'Risk Management Committee / Internal Audit Services',
    durationMinutes: 30,
  },
  {
    partNumber: 10,
    title: 'Continual Improvement Opportunities & EOMS Allocations (Outputs)',
    clause: 'ISO 21001:2018 Clause 9.3.2.f & 9.3.3',
    description:
      'Synthesis of strategic decisions, approved changes to policies/curriculum, resource allocations, and documented outputs submitted to the Governing Board.',
    suggestedReporter: 'University President / Executive Committee',
    durationMinutes: 45,
  },
];

export function getDefaultIso21001Parts(): MRAgendaPart[] {
  return ISO_21001_CLAUSE_INPUTS.map((item, index) => ({
    id: `part-${index + 1}-${Date.now()}`,
    partNumber: item.partNumber,
    title: item.title,
    clause: item.clause,
    description: item.description,
    assignedReporters: item.suggestedReporter,
    durationMinutes: item.durationMinutes,
    status: 'Pending',
    driveFolderLink: '',
  }));
}

export const DEFAULT_SUGGESTED_ATTENDEES: Omit<MRAttendee, 'id'>[] = [
  { name: 'University President', role: 'Head of Educational Organization / Chair', status: 'Invited' },
  { name: 'Vice President for Academic Affairs', role: 'VP Academic Affairs / Member', status: 'Invited' },
  { name: 'Vice President for Administration and Finance', role: 'VP Admin & Finance / Member', status: 'Invited' },
  {
    name: 'Vice President for Research & Extension',
    role: 'VP Research, Extension & Innovation / Member',
    status: 'Invited',
  },
  {
    name: 'Director, Quality Assurance Management',
    role: 'Quality Management Representative (QMR)',
    status: 'Invited',
  },
  { name: 'Lead Internal Quality Auditor', role: 'Lead Auditor / Presenter', status: 'Invited' },
  { name: 'Campus Directors (All Campuses)', role: 'Branch / Campus Management', status: 'Invited' },
  { name: 'Deans Council Representative', role: 'Academic Colleges Representation', status: 'Invited' },
  { name: 'Director, Student Affairs and Services', role: 'Learner Welfare Representative', status: 'Invited' },
  { name: 'Supreme Student Council President', role: 'Learner / Beneficiary Representative', status: 'Invited' },
];
