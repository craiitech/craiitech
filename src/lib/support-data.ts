
'use client';

export const faqs = [
  {
    role: 'General',
    questions: [
      {
        question: 'Who can use this application?',
        answer:
          'This application is not for general use. Access is restricted to authorized employees of Romblon State University who are directly involved in the Educational Organizations Management System (EOMS) process. All accounts require verification by the Quality Assurance Office.',
      },
      {
        question: 'What are the core EOMS documents required?',
        answer:
          'The system tracks 6 mandatory documents per cycle: SWOT Analysis, Needs and Expectation of Interested Parties, Operational Plan, Quality Objectives Monitoring, Risk and Opportunity Registry, and the Risk and Opportunity Action Plan (required for Medium/High risks).',
      },
      {
        question: 'How does account verification work?',
        answer:
          'After registration, you must accept a Non-Disclosure Agreement (NDA). Your account enters a pending state until an Admin verifies your identity and institutional role. You will be notified via email once access is granted.',
      },
    ],
  },
  {
    role: 'Unit Coordinators & ODIMOs',
    questions: [
      {
        question: 'How do I handle document revisions?',
        answer:
          'The portal uses automated revision control. Any update to a previously submitted or rejected document automatically increments the Revision Number (e.g., from Rev 00 to Rev 01). Each revision is assigned a new official Document Control Number.',
      },
      {
        question: 'Is the Risk Action Plan always mandatory?',
        answer:
          'No. The "Risk and Opportunity Action Plan" is only mandatory if your "Risk and Opportunity Registry" entry resulted in a Medium or High rating. Low-rated risks are exempt and marked as N/A in your compliance checklist.',
      },
      {
        question: 'What is Unit Monitoring?',
        answer:
          'It is an on-site audit where QA Representatives verify physical compliance (7S, signages, facilities) and documentary evidence. Results are logged in the Monitoring Hub and contribute to your unit\'s performance score.',
      },
      {
        question: 'How do I resubmit a rejected document?',
        answer:
          'Navigate to the submission details page of the rejected report. Review the conversation history for feedback, paste your new Google Drive link, and click "Submit Corrected Revision".',
      },
    ],
  },
  {
    role: 'Campus Directors & Supervisors',
    questions: [
      {
        question: 'How do I track unit compliance gaps?',
        answer:
          'Use the "Submissions Hub" and select the "Site Matrix" or "Unit Explorer" tab. The system provides real-time "Maturity Indices" based on approved documents. You can generate printable "Notices of Non-Compliance" for units with outstanding requirements.',
      },
      {
        question: 'What is the IQA Hub?',
        answer:
          'The Internal Quality Audit (IQA) Hub allows for strategic planning and itinerary management. Auditors use it to log objective evidence against ISO 21001:2018 clauses during the audit conduct.',
      },
      {
        question: 'Can I approve my own submissions?',
        answer:
          'No. To maintain audit integrity, the system automatically filters your own submissions out of your approval queue.',
      },
    ],
  },
  {
    role: 'Administrators',
    questions: [
      {
        question: 'What is the Risk Registry Bridge?',
        answer:
          'It is a tool on the Submission Details page that allows Admins to directly record risks from a unit\'s uploaded document into the digital Risk Register database, ensuring data parity even if the unit failed to log it manually.',
      },
      {
        question: 'How do I manage the EOMS Manual?',
        answer:
          'Admins can populate and update the 10 core sections of the official RSU EOMS Manual via the Settings page. This manual is used as a reference during monitoring visits.',
      },
      {
        question: 'Can I re-review a rejected submission?',
        answer:
          'Yes. As an Admin, you have a "Review" override capability on rejected submissions, allowing you to re-open the approval checklist without waiting for a user resubmission.',
      },
    ],
  },
];
