/**
 * @fileOverview Contextual help content for RSU EOMS Portal modules.
 */

export const helpContent: Record<string, { title: string; content: string[] }> = {
  '/dashboard': {
    title: 'Dashboard Guide',
    content: [
      'Monitor your unit\'s maturity index and recent activity logs.',
      'Check the Communications Board for campus and global announcements.',
      'Review any "Action Required" alerts regarding missing risks or overdue documents.',
    ],
  },
  '/activity-log': {
    title: 'Activity Registry Guide',
    content: [
      'Employee Activity Log: Used for daily tasks conducted at the office.',
      'Work From Home (WFH): Used for remote tasks. Specify if you are Teaching or Non-Teaching.',
      'Verification: Supervisors must "Verify" entries to count them toward accomplishment reports.',
      'Printing: Use the "Print" buttons to generate official PDFs of your logs.',
    ],
  },
  '/submissions': {
    title: 'EOMS Submission Hub',
    content: [
      'Click "New Submission" to start the document upload wizard.',
      'Draft Mode: Use this for initial content checking (No signatures required).',
      'Final Mode: Use this for signed, scanned PDFs (Completes compliance checklist).',
      'Site Matrix: Benchmark your unit\'s maturity against others in the campus.',
    ],
  },
  '/risk-register': {
    title: 'Risk & Opportunity Registry',
    content: [
      'Individual Risks/Opportunities must be encoded digitally here before document submission.',
      'Magnitude (Likelihood x Consequence) determines if an Action Plan is mandatory.',
      'Use "AI Suggest" to generate ISO-aligned mitigation strategies.',
      'Closed Status: Mark risks as "Closed" only after residual impact is verified as Low.',
    ],
  },
  '/unit-forms': {
    title: 'Unit Forms & Records',
    content: [
      'Select a unit from the directory to view its approved roster of forms.',
      'Apply for New Form: Submit a signed DRF and links to new/revised forms.',
      'Registration Status: Track your application from "Submitted" to "Approved & Registered".',
      'Masterlist: View the official PDF summary of all controlled forms in the unit.',
    ],
  },
  '/audit': {
    title: 'IQA Conduct Hub',
    content: [
      'Auditors: Use the "Available Pool" to claim itineraries and conduct audits.',
      'Evidence Log: Sequentially verify standard requirements against ISO 21001:2018 clauses.',
      'Finalize Report: Summarize findings into Commendable, Compliance, OFI, and NC categories.',
      'Templates: Print blank evidence logs for offline note-taking during inspections.',
    ],
  },
  '/monitoring': {
    title: 'Unit Monitoring Hub',
    content: [
      'Record on-site visit findings for facilities, 7S, and physical postings.',
      'Template Injection: Use the "Office" or "Classroom" buttons to auto-populate applicable items.',
      'SDD Sync: The system identifies missing EOMS reports for the unit in real-time.',
    ],
  },
  '/academic-programs': {
    title: 'CHED Programs Monitoring',
    content: [
      'Maintain the 5 quality pillars: CHED Authority, Accreditation, Faculty, Curriculum, and Outcomes.',
      'Roadmap: Track upcoming survey dates and identify overdue milestones.',
      'SDD Disaggregation: Ensure enrollment and faculty counts are disaggregated by sex.',
    ],
  },
  '/qa-reports': {
    title: 'QA Reports & CARs Vault',
    content: [
      'IQA/EQA Vault: Access the institutional archive of official audit summaries.',
      'CAR Registry: Issue and monitor Corrective Action Requests for non-conformances.',
      'Actionable Decisions: Track tasks assigned to your unit from Management Reviews.',
    ],
  },
  '/gad-corner': {
    title: 'GAD Corner Hub',
    content: [
      'SDD Hub: View university-wide sex-disaggregated data on students and faculty.',
      'GAD Initiatives: Register and track budget utilization for gender-responsive projects.',
      'Mainstreaming: Self-assess your unit\'s maturity using the HGDG framework.',
    ],
  },
  '/reports': {
    title: 'Institutional Analytics',
    content: [
      'Strategic Insights: High-level radar and bar charts on university maturity.',
      'System Directory: Search for units, campuses, and registered personnel.',
      'Submission Matrix: View a 100% transparent grid of all EOMS document statuses.',
    ],
  },
  '/settings': {
    title: 'System Settings',
    content: [
      'User Management: Activate accounts and verify institutional profiles.',
      'Signatories: Configure names appearing on official printed reports.',
      'Cycles: Set the start and end dates for First and Final submission windows.',
      'Backups: Generate institutional snapshots (XLSX) for documentation redundancy.',
    ],
  },
  '/profile': {
    title: 'User Profile & Accessibility',
    content: [
      'Update your name and sex identification for GAD reporting.',
      'Accessibility: Scale font size (80%-140%) or toggle High Contrast and Dyslexic fonts.',
      'Security: Refresh your account password regularly to maintain access integrity.',
    ],
  },
};
