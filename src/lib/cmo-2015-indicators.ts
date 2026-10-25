import type {
  CMOIndicatorDefinition,
  CMOResponseValue,
  CMOSubmissionItem,
  CMOValidatorSeat,
  CMOValidatorTier,
  GADMainstreamingPillar,
} from './types';

export const CMO_2015_MAX_RAW_SCORE = 20.0;
export const CMO_2015_EOMS_WEIGHT = 0.4; // 40% EOMS weight per docs/GAD.md

export const CMO_VALIDATOR_SEATS: {
  seat: CMOValidatorSeat;
  label: string;
  shortLabel: string;
  tier: CMOValidatorTier;
  agency: string;
}[] = [
  {
    seat: 'PDPMED_1',
    label: 'PDPMED Validator 1',
    shortLabel: 'PDPMED 1',
    tier: 'INTERNAL',
    agency: 'Planning, Development & Performance Monitoring (Internal)',
  },
  {
    seat: 'PDPMED_2',
    label: 'PDPMED Validator 2',
    shortLabel: 'PDPMED 2',
    tier: 'INTERNAL',
    agency: 'Planning, Development & Performance Monitoring (Internal)',
  },
  {
    seat: 'PDPMED_3',
    label: 'PDPMED Validator 3',
    shortLabel: 'PDPMED 3',
    tier: 'INTERNAL',
    agency: 'Planning, Development & Performance Monitoring (Internal)',
  },
  {
    seat: 'NMFO_TSRCD_SCD',
    label: 'NMFO / TSRCD / SCD',
    shortLabel: 'NMFO/TSRCD/SCD',
    tier: 'INTERNAL',
    agency: 'Sectoral / Technical Review Division (Internal)',
  },
  {
    seat: 'PCW_1',
    label: 'PCW Validator 1',
    shortLabel: 'PCW 1',
    tier: 'EXTERNAL',
    agency: 'Philippine Commission on Women (External)',
  },
  {
    seat: 'PCW_2',
    label: 'PCW Validator 2',
    shortLabel: 'PCW 2',
    tier: 'EXTERNAL',
    agency: 'Philippine Commission on Women (External)',
  },
  {
    seat: 'PCW_3',
    label: 'PCW Validator 3',
    shortLabel: 'PCW 3',
    tier: 'EXTERNAL',
    agency: 'Philippine Commission on Women (External)',
  },
  {
    seat: 'PCW_4',
    label: 'PCW Validator 4',
    shortLabel: 'PCW 4',
    tier: 'EXTERNAL',
    agency: 'Philippine Commission on Women (External)',
  },
  {
    seat: 'CHED',
    label: 'CHED Representative',
    shortLabel: 'CHED',
    tier: 'EXTERNAL',
    agency: 'Commission on Higher Education (External)',
  },
];

export const GAD_PILLAR_OPTIONS: {
  value: GADMainstreamingPillar;
  label: string;
  cmoSection: string;
}[] = [
  {
    value: 'CURRICULUM',
    label: 'Curriculum & Instruction (CMO 1 s. 2015 Part IV / Section I)',
    cmoSection: 'Descriptors 1–7',
  },
  {
    value: 'RESEARCH',
    label: 'Research Programs, Projects & Activities (CMO 1 s. 2015 Part V / Section II)',
    cmoSection: 'Descriptors 8–18',
  },
  {
    value: 'EXTENSION',
    label: 'Extension Programs, Projects & Activities (CMO 1 s. 2015 Part VI / Section III)',
    cmoSection: 'Descriptors 19–20',
  },
  {
    value: 'POLICY_GOVERNANCE',
    label: 'Enabling Mechanisms, GFPS & Policy Governance (CMO 1 s. 2015 Parts II–III)',
    cmoSection: 'Institutional Governance',
  },
  {
    value: 'FACILITIES',
    label: 'Gender-Responsive Administration, Safe Spaces & Support Facilities',
    cmoSection: 'Support Systems',
  },
];

export const CMO_2015_MANDATE_PRESETS: {
  label: string;
  genderIssue: string;
  causeOfIssue: string;
  gadObjective: string;
  pillar: GADMainstreamingPillar;
  cmoIndicatorId?: number;
}[] = [
  {
    label: 'CMO 1 s. 2015 Sec. I (#1–2): Gender-Responsive Curriculum & Syllabi Revision',
    genderIssue:
      'Mandate under CHED CMO No. 1, s. 2015 Part IV to eliminate gender stereotyping and integrate GAD principles into higher education curricula and course syllabi.',
    causeOfIssue:
      'Need for periodic review and updating of instructional syllabi, learning outcomes, and teaching materials to ensure gender-fair education.',
    gadObjective:
      'To mainstream gender-responsive learning outcomes and gender-fair instructional materials across academic programs.',
    pillar: 'CURRICULUM',
    cmoIndicatorId: 1,
  },
  {
    label: 'CMO 1 s. 2015 Sec. I (#3): Faculty Capacity Building on Gender-Fair Instruction',
    genderIssue:
      'Need to strengthen faculty competencies in delivering gender-sensitive pedagogy and non-sexist language in the classroom (CMO No. 1, s. 2015).',
    causeOfIssue:
      'Limited specialized training on gender-responsive teaching methodologies among newly hired and regular faculty members.',
    gadObjective:
      'To capacitate faculty members and academic staff on gender-sensitive classroom management and instructional delivery.',
    pillar: 'CURRICULUM',
    cmoIndicatorId: 3,
  },
  {
    label: 'CMO 1 s. 2015 Sec. I (#6): Gender-Responsive Student Services & Safe Spaces',
    genderIssue:
      'Mandate under CMO No. 1, s. 2015 and RA 11313 (Safe Spaces Act) to provide gender-responsive counseling, student welfare, and anti-sexual harassment mechanisms.',
    causeOfIssue:
      'Students across diverse gender identities require accessible guidance, psychosocial support, and awareness of CODI and safe spaces.',
    gadObjective:
      'To deliver inclusive, gender-responsive student affairs and welfare services with full Sex-Disaggregated Data (SDD) tracking.',
    pillar: 'CURRICULUM',
    cmoIndicatorId: 6,
  },
  {
    label: 'CMO 1 s. 2015 Sec. II (#8–11): Institutional GAD Research & SDD Studies',
    genderIssue:
      'Mandate under CMO No. 1, s. 2015 Part V to establish and fund a gender-responsive research agenda addressing regional and institutional gender gaps.',
    causeOfIssue:
      'Limited baseline sex-disaggregated studies and gender analysis outputs to inform evidence-based university policies.',
    gadObjective:
      'To produce, present, and publish gender-responsive and women-empowerment research outputs aligned with the University GAD Research Agenda.',
    pillar: 'RESEARCH',
    cmoIndicatorId: 8,
  },
  {
    label: 'CMO 1 s. 2015 Sec. III (#19–20): Gender-Responsive Community Extension & Livelihood',
    genderIssue:
      'Mandate under CMO No. 1, s. 2015 Part VI to integrate GAD in community extension, technology transfer, and capability-building for marginalized sectors.',
    causeOfIssue:
      'Socio-economic disparities and limited access to technical skills training among women, solo parents, PWDs, and vulnerable community members.',
    gadObjective:
      'To empower marginalized women and community beneficiaries through gender-responsive technology transfer and capability-building extension services.',
    pillar: 'EXTENSION',
    cmoIndicatorId: 19,
  },
  {
    label: 'CMO 1 s. 2015 Part III: GFPS Strengthening, SDD Database & Policy Mainstreaming',
    genderIssue:
      'Mandate under RA 9710 (Magna Carta of Women) and CMO No. 1, s. 2015 to maintain a functional GFPS and institutional Sex-Disaggregated Data (SDD) registry.',
    causeOfIssue:
      'Need for continuous institutional harmonization of SDD collection, HGDG project evaluation, and GAD monitoring across units.',
    gadObjective:
      'To institutionalize systematic SDD reporting, HGDG design review, and gender-responsive governance across unit operations.',
    pillar: 'POLICY_GOVERNANCE',
  },
];

/**
 * Complete 20-Descriptor CMO No. 1, s. 2015 Rubric Specification
 * Exact translation of `docs/GAD.md` (Max Score = 20.00 points)
 */
export const CMO_2015_INDICATORS: CMOIndicatorDefinition[] = [
  // ============================================================================
  // SECTION I: CURRICULUM / INSTRUCTION (Descriptors 1 - 7 | Max = 8.00 Points)
  // ============================================================================
  {
    id: 1,
    itemCode: '1',
    category: 'CURRICULUM',
    title: 'Development of Gender-Responsive Curricula',
    description:
      'Institutional development, revision, and Board of Regents (BOR) approval of academic curricula that integrate Gender and Development (GAD) concepts, human rights, and gender-fair education across degree programs.',
    maxScore: 2.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No gender-responsive curriculum revision or policy in place (0.00 pt)' },
      PARTIAL: {
        score: 1.0,
        label:
          'Initial curriculum review conducted or draft revisions submitted without full BOR/Academic Council adoption (1.00 pt)',
      },
      YES: {
        score: 2.0,
        label:
          'Full integration of GAD in curricula approved by BOR/Academic Council with complete Primary MOVs (2.00 pts)',
      },
    },
    primaryMovRequirements: [
      'BOR Resolution / Academic Council Resolution approving gender-responsive curricula',
      'Revised Curriculum Matrix / Prospectus showing GAD-integrated courses or GE subjects',
      'Curriculum Review Committee Report on GAD integration',
    ],
    additionalMovRequirements: [
      'CHED Certificate of Program Compliance (COPC) or evaluation notes',
      'Minutes of Curriculum Development Workshops with attendance sheets (SDD)',
    ],
  },
  {
    id: 2,
    itemCode: '2',
    category: 'CURRICULUM',
    title: 'Integration of GAD Principles in Course Syllabi (OBE)',
    description:
      'Inclusion of gender-responsive learning outcomes, topics, teaching-learning activities, and assessment tasks in Outcomes-Based Education (OBE) course syllabi across academic departments.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'Course syllabi do not reflect GAD learning outcomes or topics (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Selected course syllabi integrate GAD topics (<50% of offerings or lacking QA/Dean sign-off) (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label: 'Approved OBE course syllabi systematically integrate GAD outcomes, topics, and references (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Approved OBE Course Syllabi highlighting GAD learning outcomes and topics',
      'Departmental Syllabus Review Checklist / Certification from Dean or VPAA',
    ],
    additionalMovRequirements: [
      'Sample classroom assessment rubrics or lesson plans',
      'Summary matrix of courses with GAD integration per program',
    ],
  },
  {
    id: 3,
    itemCode: '3',
    category: 'CURRICULUM',
    title: 'Faculty Capacity Building on Gender-Responsive Instruction',
    description:
      'Conduct of regular training, seminars, and workshops capacitating faculty members on gender-sensitive pedagogy, non-sexist language, and GAD curriculum integration.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No faculty capacity-building activity on gender-responsive instruction (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Ad-hoc orientation conducted with limited faculty reach or incomplete training documentation (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Structured faculty GAD training program implemented with SDD attendance, evaluation, and completion report (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Training Activity Report / Completion Report on Gender-Responsive Instruction',
      'Sex-Disaggregated Attendance Sheets and Training Design / Program',
    ],
    additionalMovRequirements: [
      'Certificates of Participation / Appearance',
      'Post-training evaluation summary and action plans',
    ],
  },
  {
    id: 4,
    itemCode: '4',
    category: 'CURRICULUM',
    title: 'Development & Use of Gender-Fair Instructional Materials',
    description:
      'Production, review, and utilization of instructional modules, textbooks, multimedia, and teaching aids that use gender-fair language and avoid gender stereotyping.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No review or production of gender-fair instructional materials (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Instructional materials drafted or partially reviewed for gender-fair language (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'IMs evaluated and certified by Instructional Materials / GAD Review Committee as gender-responsive (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Approved Instructional Materials / Modules certified as gender-fair',
      'IM Evaluation Instrument / GAD Review Committee Certification',
    ],
    additionalMovRequirements: [
      'Institutional Guidelines on Non-Sexist / Gender-Fair Language in IMs',
      'Inventory of approved gender-sensitive learning resources',
    ],
  },
  {
    id: 5,
    itemCode: '5',
    category: 'CURRICULUM',
    title: 'Student Awareness & Co-Curricular GAD Learning Activities',
    description:
      'Conduct of student-centered symposia, orientations, and co-curricular learning initiatives on gender equality, VAWC (RA 9262), Safe Spaces Act (RA 11313), and SOGIESC awareness.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No student GAD orientation or co-curricular activity conducted (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'One-off student activity conducted without comprehensive SDD or evaluation records (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Institutionalized student GAD orientations and co-curricular activities with full SDD and assessment (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Accomplishment Report of Student GAD Orientations / Co-Curricular Seminars',
      'Sex-Disaggregated Participant Registry (Male/Female/Sectors) and Activity Evaluation',
    ],
    additionalMovRequirements: [
      'Student Handbook provisions on GAD, Anti-Sexual Harassment, and Safe Spaces',
      'Photo documentation and event materials',
    ],
  },
  {
    id: 6,
    itemCode: '6',
    category: 'CURRICULUM',
    title: 'Gender-Responsive Student Services & Support Mechanisms',
    description:
      'Provision of gender-sensitive guidance and counseling, health services, scholarships, dormitories, lactation/child-minding spaces, and functional CODI (Committee on Decorum and Investigation) for students.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'Student support services lack gender-responsive mechanisms or SDD tracking (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Basic student welfare services exist with partial gender-responsive protocols or SDD records (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Comprehensive gender-responsive student support services, CODI redress protocols, and SDD utilization reports (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'OSAS / Guidance & Counseling / Health Services Accomplishment Report with SDD',
      'CODI / Safe Spaces Policy and Student Support Mechanism Guidelines',
    ],
    additionalMovRequirements: [
      'Inventory/photos of gender-responsive facilities (all-gender restrooms, lactation stations, clinics)',
      'Client Satisfaction Measurement (CSM) disaggregated by sex',
    ],
  },
  {
    id: 7,
    itemCode: '7',
    category: 'CURRICULUM',
    title: 'Multi-Stakeholder Periodic Review & Evaluation of Curricula for Gender Responsiveness',
    description:
      'Regular monitoring and multi-stakeholder evaluation (involving GFPS, industry partners, alumni, and students) of academic programs to assess the effectiveness of GAD integration.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No multi-stakeholder curriculum review for gender responsiveness conducted (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Internal departmental review conducted without external stakeholder or GFPS validation (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Multi-stakeholder curriculum evaluation conducted with GFPS participation and documented recommendations (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Proceedings / Report of Multi-Stakeholder Curriculum Review incorporating GAD assessment',
      'Attendance Sheet and Stakeholder Feedback Forms (disaggregated by sex)',
    ],
    additionalMovRequirements: [
      'Action plan addressing stakeholder recommendations on curriculum gender responsiveness',
    ],
  },

  // ============================================================================
  // SECTION II: RESEARCH PROGRAMS / PROJECTS / ACTIVITIES (Descriptors 8 - 18 | Max = 10.00 Points)
  // ============================================================================
  {
    id: 8,
    itemCode: '8',
    category: 'RESEARCH',
    title: 'Formulation & Institutional Integration of the GAD Research Agenda (8a & 8b)',
    description:
      'Sub-item 8a (0.50 pt): Formulation of a GAD Research Agenda through multi-stakeholder consultation. Sub-item 8b (0.50 pt): Official integration of GAD into the Institutional Research Agenda approved by the governing board.',
    maxScore: 1.0,
    subIndicators: [
      {
        code: '8a',
        label: '8a. GAD Research Agenda formulated through multi-stakeholder consultation (0.50 pt)',
        maxScore: 0.5,
      },
      {
        code: '8b',
        label: '8b. GAD integrated into the BOR-approved Institutional Research Agenda (0.50 pt)',
        maxScore: 0.5,
      },
    ],
    scoringRubric: {
      NO: { score: 0.0, label: 'Neither 8a nor 8b is complied with (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label:
          'Either 8a (consultation) OR 8b (institutional integration) is complied with and supported by Primary MOV (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label: 'Both 8a AND 8b are fully complied with and supported by Primary MOVs (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      '8a: Proceedings and Attendance (SDD) of Multi-Stakeholder Consultation on the GAD Research Agenda',
      '8b: BOR Resolution / Approved Institutional Research Manual & Agenda containing the GAD Research Agenda',
    ],
    additionalMovRequirements: ['Memorandum disseminating the approved GAD Research Agenda to all colleges/units'],
  },
  {
    id: 9,
    itemCode: '9',
    category: 'RESEARCH',
    title: 'Inclusion of GAD & SDD Requirements in Institutional Research Guidelines / Manual',
    description:
      'Integration of gender analysis, HGDG research checklist, Sex-Disaggregated Data (SDD) collection, and gender-sensitive ethics criteria in the University Research Manual and proposal review templates.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'Research guidelines do not require gender analysis or SDD (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Draft guidelines or informal inclusion of GAD in research proposal templates (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label: 'Approved Research Manual / Proposal Review Rubric mandates SDD and HGDG/GAD compliance (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Excerpts of Approved University Research Manual showing GAD/SDD and HGDG review requirements',
      'Standard Research Proposal Evaluation Form / Ethics Review Checklist with GAD criteria',
    ],
    additionalMovRequirements: ['Sample evaluated research proposals scored using the HGDG/GAD rubric'],
  },
  {
    id: 10,
    itemCode: '10',
    category: 'RESEARCH',
    title: 'Capacity Building for Faculty, Staff & Students on Gender-Sensitive Research',
    description:
      'Conduct of training workshops on feminist/gender research methodologies, sex-disaggregated data analysis, and HGDG application for researchers.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No training on gender-sensitive research methodologies conducted (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'General research seminar with minor GAD topic or incomplete training records (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Dedicated training on gender-responsive research methodologies with SDD attendance and outputs (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Training Completion Report on Gender-Responsive / Feminist Research Methodologies',
      'Sex-Disaggregated Attendance Sheet and Workshop Outputs (draft GAD research capsules)',
    ],
    additionalMovRequirements: ['Training design, resource speaker profiles, and participant evaluations'],
  },
  {
    id: 11,
    itemCode: '11',
    category: 'RESEARCH',
    title: 'Institutional Funding Allocation & Utilization for GAD Research Projects',
    description:
      'Allocation and utilization of institutional funds (GAA / GPB / Research Fund / External Grants) specifically supporting approved GAD-focused or gender-mainstreamed research studies.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No institutional budget allocated or utilized for GAD research (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label:
          'Budget allocated in GPB/Work & Financial Plan but research disbursement/implementation is pending (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Approved GAD research projects funded and actively implemented with financial utilization records (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Approved GPB / Research Work & Financial Plan showing funded GAD Research Projects',
      'Notice to Proceed / MOA / Certification of Budget Utilization from Budget/Accounting Office',
    ],
    additionalMovRequirements: [
      'List of ongoing and completed funded GAD researches with researcher sex disaggregation',
    ],
  },
  {
    id: 12,
    itemCode: '12',
    category: 'RESEARCH',
    title: 'Incentives, Awards & Recognition System for Outstanding GAD Research',
    description:
      'Institutionalization of awards (e.g., Best GAD Paper at In-House Reviews) and publication/presentation incentives for faculty, staff, and student GAD researchers.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No incentive or recognition mechanism for GAD research (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Ad-hoc recognition given during research colloquia without formal policy guidelines (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label: 'Formal policy on GAD Research Incentives implemented with documented awardees (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'BOR-Approved Research Incentive Policy / Guidelines including Best GAD Research Category',
      'Official List of GAD Research Awardees / Certificates of Recognition and Disbursement Vouchers',
    ],
    additionalMovRequirements: ['In-House Review Program and Book of Abstracts highlighting GAD paper awardees'],
  },
  {
    id: 13,
    itemCode: '13',
    category: 'RESEARCH',
    title: 'Presentation of GAD Research in Local / Regional / National Conferences',
    description:
      'Presentation of completed faculty, staff, or student GAD research papers in local, regional, or national academic conferences, fora, or colloquia.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No GAD research paper presented in local/regional/national conferences (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'GAD research presented only in internal campus/college colloquium (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'GAD research paper(s) presented in recognized regional or national conferences with Primary MOVs (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Certificate of Paper Presentation and Conference Book of Abstracts (Local/Regional/National)',
      'Full Manuscript / Abstract of the presented GAD Research Paper',
    ],
    additionalMovRequirements: ['Travel Order and Conference Terminal Report of the researcher(s)'],
  },
  {
    id: 14,
    itemCode: '14',
    category: 'RESEARCH',
    title: 'Presentation of GAD Research in International Conferences',
    description:
      'Presentation of completed GAD research papers by university researchers in reputable international conferences or global gender symposia.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No GAD research paper presented in an international conference (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'GAD research accepted for international presentation (Letter of Acceptance on file) (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label: 'GAD research paper presented in an international conference with Certificate & Proceedings (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Certificate of Paper Presentation at an International Conference',
      'International Conference Proceedings / Book of Abstracts showing the GAD paper',
    ],
    additionalMovRequirements: ['Official Travel Authority and Post-Conference Echo Seminar Report'],
  },
  {
    id: 15,
    itemCode: '15',
    category: 'RESEARCH',
    title: 'Publication of GAD Research in Peer-Reviewed / Refereed Journals',
    description:
      'Publication of completed GAD or gender-mainstreamed research studies in CHED-recognized, Scopus, Web of Science, or peer-reviewed/refereed academic journals.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No GAD research published in peer-reviewed journals (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label:
          'GAD research manuscript accepted for publication or published in institutional non-indexed journal (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label: 'GAD research published in external peer-reviewed / refereed / indexed journal (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Copy of Published GAD Journal Article with DOI / ISSN and Editorial Board page',
      'Proof of Peer-Review / Indexing (Scopus, WoS, ASEAN Citation Index, or CHED-recognized journal)',
    ],
    additionalMovRequirements: ['Summary registry of published GAD articles per academic unit'],
  },
  {
    id: 16,
    itemCode: '16',
    category: 'RESEARCH',
    title: 'Citation of Published GAD Research & Policy Brief Utilization',
    description:
      'Citations of the university’s published GAD research by other scholars or utilization of GAD research findings as basis for institutional/LGU policy briefs and ordinances.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No documented citation or policy utilization of GAD research (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Policy brief drafted from GAD research or initial citation recorded in local repository (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Verified external citations (Google Scholar/Scopus) or adopted policy/program based on GAD research (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Citation Report (Google Scholar / Scopus / Crossref) or Adopted Policy Brief / Resolution citing the GAD study',
      'Copy of the citing publication or institutional policy/program document',
    ],
    additionalMovRequirements: ['Certificate of Research Utilization from beneficiary agency or LGU'],
  },
  {
    id: 17,
    itemCode: '17',
    category: 'RESEARCH',
    title: 'Establishment of GAD Research Database & Knowledge Corner in Library / Portal',
    description:
      'Maintenance of an accessible physical and digital GAD Knowledge Corner / Repository housing sex-disaggregated databases, theses, dissertations, and publications on gender studies.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No dedicated GAD database or library/digital repository (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Physical GAD shelf or partial listing exists without systematic cataloging or digital access (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Functional physical & digital GAD Research Repository / Library Corner with updated catalog and utilization logs (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Catalog / Inventory of GAD Theses, Dissertations, Books, and SDD Datasets in the University Library & Digital Portal',
      'Library / GAD Office Certification and Utilization Statistics (disaggregated by sex)',
    ],
    additionalMovRequirements: [
      'Geo-tagged photos of the GAD Corner and screenshots of the online GAD Digital Repository',
    ],
  },
  {
    id: 18,
    itemCode: '18',
    category: 'RESEARCH',
    title: 'Intellectual Property (Patents, Utility Models, Copyrights) from GAD Research & Outputs',
    description:
      'Registration of copyrights, utility models, industrial designs, or patents with IPOPHL / National Library arising from gender-responsive research, instructional modules, or women-friendly technologies.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No IP application or registration from GAD research/outputs (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'IP application filed and under substantive examination with IPOPHL / National Library (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Issued Certificate of Copyright / Utility Model / Patent for GAD research or gender-responsive innovation (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'IPOPHL / National Library Certificate of Registration (Copyright, Utility Model, or Patent) or Official Filing Receipt',
      'Documentation of the gender-responsive technology, module, or creative work',
    ],
    additionalMovRequirements: ['Technology Transfer / IP Office endorsement and HGDG score sheet of the innovation'],
  },

  // ============================================================================
  // SECTION III: EXTENSION PROGRAMS / PROJECTS / ACTIVITIES (Descriptors 19 - 20 | Max = 2.00 Points)
  // ============================================================================
  {
    id: 19,
    itemCode: '19',
    category: 'EXTENSION',
    title: 'Gender-Responsive Technology Transfer & Livelihood Extension Programs',
    description:
      'Design and implementation of community extension programs transferring appropriate technologies, livelihood skills, and social innovations that address gender needs and empower women and marginalized groups.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No technology transfer or livelihood extension program integrating GAD (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Extension project implemented with SDD attendance but lacking HGDG design assessment or MOA (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'HGDG-assessed gender-responsive extension program implemented with MOA, SDD beneficiaries, and impact report (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Approved Extension Project Proposal with HGDG Score Sheet and Signed MOA with Partner Community/LGU',
      'Extension Accomplishment Report with Sex-Disaggregated Beneficiary Data (Male/Female/Vulnerable Sectors)',
    ],
    additionalMovRequirements: ['Beneficiary satisfaction survey and post-extension socio-economic monitoring report'],
  },
  {
    id: 20,
    itemCode: '20',
    category: 'EXTENSION',
    title: 'Capability-Building & Advocacy Extension Services for Marginalized Sectors & LGUs',
    description:
      'Conduct of sustained extension capability-building, legal/gender rights literacy, VAWC desk strengthening, and technical assistance to partner barangays, LGUs, schools, and vulnerable sectors.',
    maxScore: 1.0,
    scoringRubric: {
      NO: { score: 0.0, label: 'No capability-building or GAD advocacy extension service conducted (0.00 pt)' },
      PARTIAL: {
        score: 0.5,
        label: 'Single outreach activity conducted without formal partnership or post-activity evaluation (0.50 pt)',
      },
      YES: {
        score: 1.0,
        label:
          'Sustained capability-building extension program for marginalized sectors/LGUs with full SDD, evaluation, and MOVs (1.00 pt)',
      },
    },
    primaryMovRequirements: [
      'Terminal / Accomplishment Report of Capability-Building Extension Program',
      'Sex-Disaggregated Attendance Registry (including Solo Parents, PWDs, Senior Citizens, Youth, IPs) and Partner Certification',
    ],
    additionalMovRequirements: ['Training modules used in community capability-building and impact testimonials'],
  },
];

/**
 * Calculates the point value for an individual CMO No. 1, s. 2015 indicator (1–20)
 * based on the selected response ('NO' | 'PARTIAL' | 'YES').
 */
export function calculateCmoItemScore(indicatorId: number, response?: CMOResponseValue): number {
  if (!response || response === 'NO') return 0.0;
  const indicator = CMO_2015_INDICATORS.find((i) => i.id === indicatorId);
  if (!indicator) return 0.0;
  return indicator.scoringRubric[response]?.score ?? 0.0;
}

/**
 * Computes the complete CMO No. 1, s. 2015 Raw Score (/20.00), Compliance Rate (%),
 * and 40% EOMS Weighted Score for both Self-Assessment and Validated scores.
 */
export function computeCmoSubmissionTotals(items: Record<number, CMOSubmissionItem> = {}) {
  let curriculumSelf = 0;
  let curriculumVal = 0;
  let researchSelf = 0;
  let researchVal = 0;
  let extensionSelf = 0;
  let extensionVal = 0;

  for (const ind of CMO_2015_INDICATORS) {
    const item = items[ind.id];
    const selfScore = item ? calculateCmoItemScore(ind.id, item.selfResponse) : 0;
    const valScore =
      item?.finalValidatedScore !== undefined
        ? Number(item.finalValidatedScore)
        : item?.finalValidatedResponse
          ? calculateCmoItemScore(ind.id, item.finalValidatedResponse)
          : selfScore;

    if (ind.category === 'CURRICULUM') {
      curriculumSelf += selfScore;
      curriculumVal += valScore;
    } else if (ind.category === 'RESEARCH') {
      researchSelf += selfScore;
      researchVal += valScore;
    } else if (ind.category === 'EXTENSION') {
      extensionSelf += selfScore;
      extensionVal += valScore;
    }
  }

  const rawScoreSelf = Number((curriculumSelf + researchSelf + extensionSelf).toFixed(2));
  const complianceRateSelf = Number(((rawScoreSelf / CMO_2015_MAX_RAW_SCORE) * 100).toFixed(2));
  const weightedScoreSelf = Number((complianceRateSelf * CMO_2015_EOMS_WEIGHT).toFixed(2));

  const rawScoreValidated = Number((curriculumVal + researchVal + extensionVal).toFixed(2));
  const complianceRateValidated = Number(((rawScoreValidated / CMO_2015_MAX_RAW_SCORE) * 100).toFixed(2));
  const weightedScoreValidated = Number((complianceRateValidated * CMO_2015_EOMS_WEIGHT).toFixed(2));

  return {
    rawScoreSelf,
    complianceRateSelf,
    weightedScoreSelf,
    rawScoreValidated,
    complianceRateValidated,
    weightedScoreValidated,
    sectionScores: {
      curriculum: {
        self: Number(curriculumSelf.toFixed(2)),
        validated: Number(curriculumVal.toFixed(2)),
        max: 8.0,
      },
      research: {
        self: Number(researchSelf.toFixed(2)),
        validated: Number(researchVal.toFixed(2)),
        max: 10.0,
      },
      extension: {
        self: Number(extensionSelf.toFixed(2)),
        validated: Number(extensionVal.toFixed(2)),
        max: 2.0,
      },
    },
  };
}

/**
 * PCW-NEDA-DBM Joint Circular No. 2012-01 HGDG Attribution Piecewise Function
 */
export function calculateHgdgAttributionRate(score: number): number {
  const s = Number(score) || 0;
  if (s < 4.0) return 0;
  if (s < 8.0) return 0.25;
  if (s < 15.0) return 0.5;
  if (s < 20.0) return 0.75;
  return 1.0;
}

export function getHgdgTierDescription(score: number): string {
  const s = Number(score) || 0;
  if (s < 4.0) return 'GAD is Invisible (0% Attribution)';
  if (s < 8.0) return 'Promising GAD Prospects (25% Attribution)';
  if (s < 15.0) return 'Gender-Sensitive (50% Attribution)';
  if (s < 20.0) return 'Gender-Responsive (75% Attribution)';
  return 'Fully Gender-Responsive (100% Attribution)';
}
