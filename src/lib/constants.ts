/**
 * @fileOverview Centralized constants for the RSU EOMS Framework.
 * Moving these here prevents circular dependencies between Pages and Components.
 */

import type { KpiCategory, KpiThreshold } from './types';

export const TOTAL_REPORTS_PER_CYCLE = 6;
export const TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT = TOTAL_REPORTS_PER_CYCLE * 2;

export const MAIN_CAMPUS_NAME = 'Main Campus';
export const MAIN_CAMPUS_ID = 'HOsGLxGvyiC5DLizifik';

export const submissionTypes = [
  'SWOT Analysis',
  'Needs and Expectation of Interested Parties',
  'Operational Plan',
  'Quality Objectives Monitoring',
  'Risk and Opportunity Registry',
  'Risk and Opportunity Action Plan',
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
  program_accreditation: 'Program Accreditation',
  'Program Accreditation': 'Program Accreditation',
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

// ============================================================
// INSTITUTIONAL ALIGNMENT FRAMEWORKS (SUC LEVELLING, QUALITY OBJECTIVES, 10-POINT AGENDA)
// ============================================================

export const UNIVERSITY_QUALITY_OBJECTIVES = [
  {
    code: 'QO-1',
    title: 'QO 1: Regulatory & Statutory Compliance',
    description: '100% adherence to CHED, PRC, DBM, COA, Civil Service, and statutory mandates.',
  },
  {
    code: 'QO-2',
    title: 'QO 2: System Certification (ISO 21001:2018 EOMS)',
    description:
      'Sustain full certification across all campuses under international educational quality management standards.',
  },
  {
    code: 'QO-3',
    title: 'QO 3: Program Accreditation & Quality Standards',
    description:
      'Attain Level II/III/IV AACCUP accreditation and Certificate of Program Compliance (COPC) across curricular programs.',
  },
  {
    code: 'QO-4',
    title: 'QO 4: Stakeholder Satisfaction & Continual Improvement',
    description:
      'Systematically elevate client satisfaction (CSM), client feedback resolution, and internal audit effectiveness.',
  },
] as const;

export const SUC_LEVELLING_KRAS = [
  {
    code: 'KRA-1',
    title: 'KRA 1: Higher and Advanced Education Services',
    description:
      'Quality and relevance of instruction, teaching effectiveness, student development, access and equity.',
  },
  {
    code: 'KRA-2',
    title: 'KRA 2: Research Capability and Creative Works / Outputs',
    description: 'Peer-reviewed publications, patent filings, utility models, citations, and creative innovation.',
  },
  {
    code: 'KRA-3',
    title: 'KRA 3: Extension Services and Community Engagement',
    description: 'High-impact community outreach, technology transfer, livelihood training, and gender mainstreaming.',
  },
  {
    code: 'KRA-4',
    title: 'KRA 4: Management of Resources & Financial Viability',
    description:
      'Prudent budget utilization rate (BUR), income generation, land use development, and asset maintenance.',
  },
  {
    code: 'KRA-5',
    title: 'KRA 5: Institutional Governance, Digitalization & General Administrative Support',
    description: 'Digital automation, ISO compliance, timely reporting, transparency, and clean audit opinions.',
  },
] as const;

export const UNIVERSITY_TEN_POINT_AGENDA = [
  {
    code: 'Point-1',
    title: 'Point 1: Academic Excellence & Quality Curricular Delivery',
    description: 'Curricular modernization, high licensure passing rates, and holistic learning outcomes.',
  },
  {
    code: 'Point-2',
    title: 'Point 2: Faculty Competency & Professional Advancement',
    description: 'Continuous graduate education, doctoral degree attainment, and high-impact teaching standards.',
  },
  {
    code: 'Point-3',
    title: 'Point 3: Research, Innovation & Intellectual Property Commercialization',
    description: 'Scopus/WoS publication output, invention patents, research grants, and technology incubation.',
  },
  {
    code: 'Point-4',
    title: 'Point 4: Resource Generation, Prudent Financial Stewardship & Land Use (RSU-RISE)',
    description: 'Enhanced internal revenue generation, infrastructure development, and campus land use planning.',
  },
  {
    code: 'Point-5',
    title: 'Point 5: Local, National & International Linkages (ILAO) & Transnational Partnerships',
    description: 'Global mobility, industry linkages, alumni engagement, and cross-border academic cooperation.',
  },
  {
    code: 'Point-6',
    title: 'Point 6: Student Development, Welfare Services & Inclusive Education',
    description:
      'Psycho-social support, career placement, scholarship accessibility (UniFAST), and leadership cultivation.',
  },
  {
    code: 'Point-7',
    title: 'Point 7: Community Extension, Technology Transfer & Grassroots Empowerment',
    description: 'Sustainable livelihood projects, community resilience, and transfer of university innovations.',
  },
  {
    code: 'Point-8',
    title: 'Point 8: Smart Green Campus, Environmental Sustainability & Disaster Resilience',
    description: 'Eco-friendly campus operations, renewable energy, waste management, and climate adaptation.',
  },
  {
    code: 'Point-9',
    title: 'Point 9: Digital Transformation, MIS Modernization & EOMS Systems Integration',
    description: 'Paperless digital workflows, enterprise portals, database integrity, and high-speed campus networks.',
  },
  {
    code: 'Point-10',
    title: 'Point 10: Good Governance, Transparency, Accountability & Quality Service Culture',
    description: 'Citizen Charter compliance, zero red tape, FOI compliance, and stakeholder-centric service ethics.',
  },
] as const;

export const ARCHIPELAGIC_PILLARS = [
  {
    code: 'Pillar-01',
    title: 'Pillar 01: Multi-Island Responsive Education',
    description:
      'Contextualized indigenous and multi-island responsive academic programs, localized multi-island pedagogy, island-flexible academic workforce, and MILES facilities.',
  },
  {
    code: 'Pillar-02',
    title: 'Pillar 02: Transregenerative Island-Centered Research',
    description:
      'Transregenerative multi-island knowledge systems (blue-green economy, marble geoscience, eco-cultural heritage), and cross-island research resource sharing network.',
  },
  {
    code: 'Pillar-03',
    title: 'Pillar 03: Island-Rooted Immersive Extension',
    description:
      'Island-rooted extension programs aligned with the RSU KomUnibersidad philosophy and community empowerment.',
  },
  {
    code: 'Pillar-04',
    title: 'Pillar 04: Archipelagic Leadership and Governance',
    description:
      'Wave-adaptive and tide-responsive institutional policies, Archipelagic Fiscal Stewardship Program, and island-responsive human resource development.',
  },
  {
    code: 'Pillar-05',
    title: 'Pillar 05: Cross-Cutting Discipline for Island Education Development',
    description:
      'Multi-Island Quality Assurance Framework, Archipelagic Internationalization Program, Gender and Development (GAD), and Disaster-Ready Resilience Program.',
  },
] as const;

export function getAgendaList(agenda?: string | string[], agendas?: string[]): string[] {
  if (Array.isArray(agendas) && agendas.length > 0) {
    return agendas.filter((a) => a && a !== 'none');
  }
  if (Array.isArray(agenda)) {
    return agenda.filter((a) => a && a !== 'none');
  }
  if (agenda && agenda !== 'none') {
    return [agenda];
  }
  return [];
}
