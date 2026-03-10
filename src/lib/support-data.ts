
'use server';

export const faqs = [
  {
    role: 'General',
    questions: [
      {
        question: 'Who can use this application?',
        answer:
          'This application is restricted to authorized employees of Romblon State University involved in the EOMS process. All accounts require verification by the Quality Assurance Office.',
      },
      {
        question: 'What are the core EOMS documents required?',
        answer:
          'The system tracks 6 mandatory documents: SWOT, Needs & Expectations, Operational Plan, Quality Objectives, Risk Registry, and the Risk Action Plan (mandatory for Medium/High risks).',
      },
      {
        question: 'How do I handle my profile details?',
        answer:
          'Users can update their first and last names via the Profile page. Institutional details like Campus, Unit, and Role are locked after verification and can only be changed by an Administrator.',
      },
    ],
  },
  {
    role: 'Unit Coordinators & ODIMOs',
    questions: [
      {
        question: 'What is the "Draft" submission mode?',
        answer:
          'Draft mode allows you to submit a raw Google Doc for content review before securing official signatures. Final mode is for scanned, signed PDFs that complete the compliance checklist.',
      },
      {
        question: 'How do I manage the CHED Program Monitoring Workspace?',
        answer:
          'Navigate to your academic program. You must maintain five core modules: CHED/RQAT authority, Accreditation milestones, Faculty staffing (sex-disaggregated), Curriculum notation, and Outcome results.',
      },
      {
        question: 'How do I register a new unit form?',
        answer:
          'In "Unit Forms & Records", download the DRF template, secure signatures, and submit a Registration Request. Once verified by QA and the President, the form is enrolled in your unit\'s official roster.',
      },
      {
        question: 'What happens if my risk rating is "Low"?',
        answer:
          'If your Risk Registry entry magnitude is below 5, the "Risk Action Plan" is marked as N/A. You are still required to submit the Registry document itself.',
      },
    ],
  },
  {
    role: 'Campus Directors & Supervisors',
    questions: [
      {
        question: 'How do I monitor site-wide maturity?',
        answer:
          'Use the "Site Matrix" in the Submission Hub. Clicking on your campus displays an aggregate dashboard with maturity scores, unit leaderboards, and gap identifications.',
      },
      {
        question: 'What are Consolidated Notices?',
        answer:
          'Supervisors can generate a single "Notice of Compliance" for a fully compliant campus, or a "Notice of Non-Compliance" listing all units with outstanding requirements for the selected year.',
      },
      {
        question: 'How do I track Actionable Decisions?',
        answer:
          'The "Actionable Decisions" hub lists all tasks assigned to your site from Management Reviews. You must provide implementation updates and evidence to close these items.',
      },
    ],
  },
  {
    role: 'Administrators',
    questions: [
      {
        question: 'How do I perform a system backup?',
        answer:
          'In Settings > Data & Backups, you can download a multi-sheet XLSX snapshot of the entire database or export the permanent System Audit Log for external quality audits.',
      },
      {
        question: 'How do I manage the Institutional Roadmap?',
        answer:
          'The roadmap is automatically generated from the Accreditation records in the Program Monitoring module. Admins can oversee upcoming survey dates and identify overdue quality milestones.',
      },
      {
        question: 'Can I re-open a closed decision or CAR?',
        answer:
          'Yes. Administrators have override permissions to update the status of any registry entry, including those marked as Closed, to ensure documentation accuracy.',
      },
    ],
  },
];
