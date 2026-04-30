'use client';

/**
 * @fileOverview Rich step-by-step guidance data for RSU EOMS Portal modules.
 * This registry powers the PageGuidance sidebar and updates dynamically via route + tab detection.
 */

export interface PageHelp {
  title: string;
  description: string;
  steps: { title: string; desc: string }[];
  buttons: { label: string; action: string; labelShort?: string }[];
  nextStep?: string;
}

export const helpContent: Record<string, PageHelp> = {
  '/dashboard': {
    title: 'Dashboard: Executive Summary',
    description: 'The central hub for monitoring your quality assurance performance and institutional announcements.',
    steps: [
      { title: 'Check Announcements', desc: 'Read the Communications Board for site-specific directives from your Director.' },
      { title: 'Monitor Maturity', desc: 'View your unit\'s compliance percentage. High percentage indicates all mandatory docs are verified.' },
      { title: 'Review Alerts', desc: 'Address any red "Action Required" cards immediately to avoid non-compliance flags.' }
    ],
    buttons: [
      { label: 'View Year', labelShort: 'Year', action: 'Filters the entire dashboard to a specific academic year.' },
      { label: 'Register Risk', labelShort: 'Risk', action: 'Direct shortcut to encode identified threats.' }
    ],
    nextStep: 'Ensure your current year\'s Risk Register is populated before submitting your first cycle reports.'
  },
  '/dashboard?tab=overview': {
    title: 'Dashboard: Overview',
    description: 'Real-time performance metrics and communication updates.',
    steps: [
      { title: 'Monitor KPIs', desc: 'Check Pending Approvals and Maturity scores for the selected year.' },
      { title: 'Read Announcements', desc: 'Review the Communications Board for institutional alerts.' },
      { title: 'Check Quality Gaps', desc: 'Address any highlighted Action Items (CARs, MR Decisions, or Accreditation Gaps).' }
    ],
    buttons: [
      { label: 'View Year', labelShort: 'Year', action: 'Switches the analytical context of the dashboard.' },
      { label: 'Print Log', labelShort: 'Print', action: 'Generates a report of assigned quality actions.' }
    ]
  },
  '/dashboard?tab=analytics': {
    title: 'Dashboard: Audit & Analytics',
    description: 'In-depth verification of submission cycles and risk posture.',
    steps: [
      { title: 'Verify Cycles', desc: 'Check the Submission Schedule to ensure no pending deadlines are missed.' },
      { title: 'Analyze Risks', desc: 'Review the Risk Status Overview to monitor treatment progress.' },
      { title: 'Parity Check', desc: 'Use the Compliance Heatmap to identify site-level documentation gaps.' }
    ],
    buttons: [
      { label: 'Risk Rating', labelShort: 'Risk', action: 'Categorization of threats by Magnitude.' }
    ]
  },
  '/dashboard?tab=strategic': {
    title: 'Dashboard: Strategic Outlook',
    description: 'Long-term trends and institutional maturity profiling.',
    steps: [
      { title: 'Radar Profile', desc: 'Analyze balance across the 5 core EOMS quality pillars.' },
      { title: 'Trend Velocity', desc: 'Monitor Compliance Over Time to track institutional adoption.' },
      { title: 'Risk Funnel', desc: 'Verify the movement of raw threats into controlled/mitigated factors.' }
    ],
    buttons: [
      { label: 'Maturity Radar', labelShort: 'Radar', action: 'Visual map of quality assurance balance.' }
    ]
  },
  '/dashboard?tab=actions': {
    title: 'Dashboard: Submission Checklist',
    description: 'Verification status of mandatory EOMS documentation.',
    steps: [
      { title: 'Check Progress', desc: 'Review the percentage of documents that have reached the "Approved" status.' },
      { title: 'Manage Files', desc: 'Click "Manage Submissions" to upload drafts or final signed records.' }
    ],
    buttons: [
      { label: 'Manage Submissions', labelShort: 'Pencil', action: 'Enters the document submission wizard.' }
    ]
  },
  '/dashboard?tab=history': {
    title: 'Dashboard: Submission History',
    description: 'Chronological audit trail of your unit\'s document lifecycle.',
    steps: [
      { title: 'Review Logs', desc: 'Browse past revisions and their final determinations (Approved/Rejected).' },
      { title: 'Inspect Records', desc: 'Use the "Eye" icon to view the specific version details and feedback.' }
    ],
    buttons: [
      { label: 'View', labelShort: 'Eye', action: 'Opens the detail page for a specific submission revision.' }
    ]
  },

  // --- GAD CORNER ---
  '/gad-corner': {
    title: 'GAD Corner Hub',
    description: 'Consolidated Gender and Development workspace for planning and accomplishment monitoring.',
    steps: [
      { title: 'Select Context', desc: 'Use the "Fiscal Year" and "Unit" filters to scope your data view.' },
      { title: 'Browse Modules', desc: 'Navigate between the PAP, SDD, and Mainstreaming tabs to manage different GAD pillars.' }
    ],
    buttons: [
      { label: 'Fiscal Year', labelShort: 'Year', action: 'Switches the fiscal reporting context.' },
      { label: 'Context Filter', labelShort: 'Unit', action: 'Narrows data to a specific department or campus.' }
    ]
  },
  '/gad-corner?tab=overview': {
    title: 'GAD: Strategic Overview',
    description: 'Key performance indicators for budget utilization and project reach.',
    steps: [
      { title: 'Budget Pulse', desc: 'Monitor the utilization rate to ensure funds are being spent as planned in the GPB.' },
      { title: 'Sectoral Mix', desc: 'Review the "Student Sectoral Reach" chart to identify marginalized group representation.' }
    ],
    buttons: [
      { label: 'Utilization', labelShort: 'Rate', action: 'Percentage of allocated GAD budget expended.' }
    ]
  },
  '/gad-corner?tab=activities': {
    title: 'GAD: Event Registry',
    description: 'Internal logging of activity participant data (SDD).',
    steps: [
      { title: 'Register Event', desc: 'Click "Log Event" to record a new seminar, workshop, or activity.' },
      { title: 'Input SDD', desc: 'Provide the verified headcount of male/female participants and sectoral tags.' },
      { title: 'Actuals', desc: 'Record the actual budget used for the specific event to sync with the AR.' }
    ],
    buttons: [
      { label: 'Log Event', labelShort: 'Log', action: 'Opens the internal SDD entry form.' }
    ],
    nextStep: 'Ensure activity codes match your GPB items for automatic data synchronization.'
  },
  '/gad-corner?tab=gpb': {
    title: 'GAD: Plan & Budget (GPB)',
    description: 'Official annual planning for gender-responsive programs.',
    steps: [
      { title: 'Identify Issue', desc: 'Record the specific gender issue or mandate being addressed.' },
      { title: 'Define PAP', desc: 'Describe the Program, Activity, or Project designed to mitigate the issue.' },
      { title: 'Allocate Budget', desc: 'Assign fiscal resources. The system will check against the 5% institutional mandate.' }
    ],
    buttons: [
      { label: 'Add Entry', labelShort: 'New', action: 'Creates a new GPB planning item.' },
      { label: 'Print GPB', labelShort: 'Print', action: 'Generates the official PCW-standard PDF.' }
    ]
  },
  '/gad-corner?tab=ar': {
    title: 'GAD: Accomplishment Report',
    description: 'Quarterly and annual verification of planned vs actual GAD outputs.',
    steps: [
      { title: 'Verify Sync', desc: 'The system automatically pulls participant data from the Event Registry.' },
      { title: 'Analyze Variance', desc: 'Review budget variances and provide justifications for any deviations from the GPB.' },
      { title: 'Print AR', desc: 'Generate the final report for submission to the Quality Assurance Office.' }
    ],
    buttons: [
      { label: 'Print GAD AR', labelShort: 'AR', action: 'Generates the consolidated accomplishment summary.' }
    ]
  },
  '/gad-corner?tab=sdd': {
    title: 'GAD: SDD Hub',
    description: 'Unified Sex-Disaggregated Data repository for students and personnel.',
    steps: [
      { title: 'Personnel Census', desc: 'Unit Heads: Update your office headcount by sex and sector for the current year.' },
      { title: 'Student Baseline', desc: 'Review automated roll-ups of student data from program compliance logs.' }
    ],
    buttons: [
      { label: 'Commit Census', labelShort: 'Save', action: 'Saves your unit\'s employee headcount registry.' }
    ]
  },
  '/gad-corner?tab=mainstreaming': {
    title: 'GAD: Mainstreaming',
    description: 'HGDG-aligned qualitative assessment of institutional gender responsiveness.',
    steps: [
      { title: 'Select Criterion', desc: 'Review the 8 core PCW mainstreaming elements across Policy, Facility, and Data.' },
      { title: 'Self-Assessment', desc: 'Click the item card to toggle its status once your unit has implemented the requirement.' },
      { title: 'Audit Verification', desc: 'Admins will verify these self-assessments during the field monitoring visits.' }
    ],
    buttons: [
      { label: 'Maturity Index', labelShort: '%', action: 'A calculated percentage of implemented mainstreaming criteria.' }
    ]
  },

  // --- UNIT MONITORING ---
  '/monitoring': {
    title: 'Unit Monitoring Hub',
    description: 'On-site verification tool for facility maintenance and physical standard compliance.',
    steps: [
      { title: 'Performance Review', desc: 'Inspect the analytics tab for overall compliance trends by site.' },
      { title: 'Check Results', desc: 'View unit scores in the "Visit Log" tab after monitoring conduct.' }
    ],
    buttons: [
        { label: 'New Visit', labelShort: 'New', action: 'Launches the field monitoring digital checklist.' },
        { label: 'Print Record', labelShort: 'Print', action: 'Generates the official signed Monitoring Report.' }
    ]
  },
  '/monitoring?tab=performance': {
    title: 'Monitoring: Performance',
    description: 'Institutional analytics for on-site quality audits.',
    steps: [
      { title: 'Review Gaps', desc: 'Identify which monitoring items (e.g. ARTA signages) have the most non-conformities.' },
      { title: 'Benchmark Sites', desc: 'Compare compliance scores between different campuses and units.' }
    ],
    buttons: [
        { label: 'Export', labelShort: 'XLSX', action: 'Downloads the monitoring raw data to Excel.' }
    ]
  },
  '/monitoring?tab=history': {
    title: 'Monitoring: Visit Log',
    description: 'Chronological archive of all field inspections conducted.',
    steps: [
      { title: 'Search Units', desc: 'Filter the list by unit name or officer in charge.' },
      { title: 'View Score', desc: 'Check the color-coded compliance badge for immediate performance feedback.' }
    ],
    buttons: [
        { label: 'Edit', labelShort: 'Edit', action: 'Admins can modify past logs if corrections are needed.' }
    ]
  },
  '/monitoring?tab=findings': {
    title: 'Monitoring: Gaps & Findings',
    description: 'Direct visibility into outstanding non-conformities from field visits.',
    steps: [
      { title: 'Inspect Red Flags', desc: 'Units listed here have items marked "Not Available" or "Needs Updating".' },
      { title: 'Remediation', desc: 'Address specific remarks logged by the monitor to clear the gap.' }
    ],
    buttons: [
        { label: 'Findings', labelShort: 'Gaps', action: 'Total count of units currently flagged.' }
    ]
  },

  // --- ACADEMIC PROGRAMS ---
  '/academic-programs': {
    title: 'CHED Program Monitoring',
    description: 'Decision support system for managing academic program compliance and quality.',
    steps: [
      { title: 'Program Selection', desc: 'Search for a degree program to enter its focused compliance workspace.' },
      { title: 'Check Roadmap', desc: 'Monitor the "Survey Pipeline" for upcoming AACCUP accreditation targets.' }
    ],
    buttons: [
        { label: 'Workspace', labelShort: 'Open', action: 'Enters the 5-module compliance dashboard for a program.' }
    ]
  },
  '/academic-programs?tab=analytics': {
    title: 'Programs: Decision Support',
    description: 'High-level maturity profiles and longitudinal achievement trends.',
    steps: [
      { title: 'Maturity Radar', desc: 'Verify the balance across Authority, Faculty, and Outcome pillars.' },
      { title: 'Survey Pipeline', desc: 'Review the roadmap to prepare for upcoming accreditation years.' }
    ],
    buttons: [
        { label: 'AY Filter', labelShort: 'AY', action: 'Scopes analytics to a specific academic year.' }
    ]
  },
  '/academic-programs?tab=batch-hub': {
    title: 'Programs: Batch Data Hub',
    description: 'Rapid entry module for institutional student and outcome statistics.',
    steps: [
      { title: 'Select Mode', desc: 'Choose between Enrollment, Graduation, Board Exam, or Tracer data.' },
      { title: 'Update Records', desc: 'Click "Start Log" to update metrics for a specific program for the selected year.' }
    ],
    buttons: [
        { label: 'Apply & Sync', labelShort: 'Save', action: 'Commits batch updates to the central academic registry.' }
    ]
  },
  '/academic-programs?tab=registry': {
    title: 'Programs: Program Registry',
    description: 'Comprehensive directory of all university degree offerings.',
    steps: [
      { title: 'Status Check', desc: 'Verify if a program is active or closed (phased-out).' },
      { title: 'College Filter', desc: 'Identify programs belonging to specific academic units.' }
    ],
    buttons: [
        { label: 'Register', labelShort: 'New', action: 'Admins: Add a new program to the university portfolio.' }
    ]
  },

  // --- SUBMISSIONS ---
  '/submissions': {
    title: 'EOMS Submission Hub',
    description: 'The primary workflow for ISO 7.5.3 compliance. Manage the lifecycle of the 6 core EOMS documents.',
    steps: [
      { title: 'Identify Cycle', desc: 'Determine if you are submitting for the First or Final cycle based on the university calendar.' },
      { title: 'New Submission', desc: 'Click the button and select the specific report type (e.g., SWOT, Op Plan).' },
      { title: 'Select Version', desc: 'Choose "Draft" for content checking or "Final" for signed institutional records.' }
    ],
    buttons: [
      { label: 'New Submission', labelShort: 'New', action: 'Starts the multi-step document upload wizard.' },
      { label: 'Download Templates', labelShort: 'Templates', action: 'Accesses the official RSU GDrive for standardized forms.' }
    ]
  },

  // --- RISK REGISTER ---
  '/risk-register': {
    title: 'Risk Management Registry',
    description: 'A digital tool for proactive institutional governance. Log and mitigate vulnerabilities.',
    steps: [
      { title: 'Identify Factor', desc: 'Identify a Risk (Threat) or Opportunity (Gain) linked to a process objective.' },
      { title: 'Baseline Analysis', desc: 'Rate the Likelihood and Consequence (1-5). Magnitude 5+ triggers mandatory action.' },
      { title: 'Execute Treatment', desc: 'Assign a person and target date to mitigate the risk.' }
    ],
    buttons: [
      { label: 'Log New Entry', labelShort: 'Log', action: 'Starts the risk identification and analysis form.' },
      { label: 'AI Suggest', labelShort: 'AI', action: 'Uses GenAI to propose professional ISO-aligned treatment plans.' }
    ]
  },

  // --- UNIT FORMS & RECORDS ---
  '/unit-forms': {
    title: 'Unit Forms & Records',
    description: 'Management of controlled university forms and unit document rosters.',
    steps: [
      { title: 'Access Roster', desc: 'Click "Access Official Roster" to view your unit\'s approved form library.' },
      { title: 'Verify Preview', desc: 'Check the Masterlist PDF preview to confirm currently registered form versions.' }
    ],
    buttons: [
        { label: 'Apply for Form', labelShort: 'Register', action: 'Starts the DRF process to enroll new or revised forms.' }
    ]
  },
  '/unit-forms?tab=roster': {
    title: 'Form Control: Active Roster',
    description: 'Browse and download verified controlled documents.',
    steps: [
      { title: 'Search Forms', desc: 'Find forms by code (e.g. QAO-01) or official title.' },
      { title: 'Request Download', desc: 'Logging is mandatory for downloads to maintain the audit trail of form utilization.' }
    ],
    buttons: [
        { label: 'Link Authorized', labelShort: 'Auth', action: 'Opens the secure download link after logging requester info.' }
    ]
  },
  '/unit-forms?tab=register': {
    title: 'Form Control: Registration',
    description: 'Standard 4-step workflow for enrolling controlled documents.',
    steps: [
      { title: 'Download DRF', desc: 'Get the official Document Registration Form template.' },
      { title: 'Secure Signatures', desc: 'For Final registration, a scanned, signed copy is mandatory.' },
      { title: 'Execute Wizard', desc: 'Paste the GDrive links and submit for QA and Presidential review.' }
    ],
    buttons: [
        { label: 'Launch Wizard', labelShort: 'Start', action: 'Opens the multi-step registration application.' }
    ]
  },

  // --- QA REPORTS & CARS ---
  '/qa-reports': {
    title: 'QA Reports & CARs',
    description: 'Central vault for Audit summaries, Management Reviews, and Corrective Actions.',
    steps: [
      { title: 'Strategic Review', desc: 'Access high-level institutional quality summaries and decision trackers.' },
      { title: 'Select Module', desc: 'Use the tab navigation to switch between Analytics, Decisions, CARs, or Audit Reports.' }
    ],
    buttons: [
        { label: 'Year Filter', labelShort: 'Year', action: 'Scopes all registry data to a specific review year.' }
    ]
  },
  '/qa-reports?tab=overview': {
    title: 'QA Reports: Overview',
    description: 'Visual analytics of institutional non-conformities and audit findings.',
    steps: [
      { title: 'Resolution Rate', desc: 'Monitor the institutional score for closing Corrective Action Requests.' },
      { title: 'Findings Profile', desc: 'Review the distribution of NCs vs OFIs to identify systemic quality risks.' }
    ],
    buttons: [
        { label: 'Resolution', labelShort: 'Rate', action: 'Percent of CARs closed vs total issued.' }
    ]
  },
  '/qa-reports?tab=decisions': {
    title: 'QA Reports: Decisions',
    description: 'Tracking the implementation of tasks assigned from Management Reviews.',
    steps: [
      { title: 'Identify Assignment', desc: 'Filter the list to find decisions assigned to your unit or campus.' },
      { title: 'Update Status', desc: 'Click "Update" to record action taken, attach evidence, and move items toward closure.' }
    ],
    buttons: [
        { label: 'Update', labelShort: 'Log', action: 'Opens the decision implementation tracking form.' }
    ]
  },
  '/qa-reports?tab=car': {
    title: 'QA Reports: CAR Registry',
    description: 'The master log of all Corrective Action Requests issued during audits.',
    steps: [
      { title: 'Respond to NC', desc: 'Units: If you have an "Open" CAR, click "Manage" to perform root cause analysis.' },
      { title: 'Final Verification', desc: 'Admins: Review unit responses and verify effectiveness to close the CAR.' }
    ],
    buttons: [
        { label: 'Print Registry', labelShort: 'Print', action: 'Generates the official CAR Control Register (QAO-00-019).' },
        { label: 'Issue CAR', labelShort: 'New', action: 'Opens the form to create a new institutional request.' }
    ]
  },
  '/qa-reports?tab=iqa': {
    title: 'QA Reports: IQA Vault',
    description: 'Permanent archive of Internal Quality Audit summary reports.',
    steps: [
      { title: 'Access Records', desc: 'Browse internal audit history for Romblon State University.' },
      { title: 'Preview Files', desc: 'Use the "Preview" button to view the vaulted PDF evidence directly in the portal.' }
    ],
    buttons: [
        { label: 'Vault', labelShort: 'Open', action: 'Accesses the institutional IQA document archive.' }
    ]
  },
  '/qa-reports?tab=eqa': {
    title: 'QA Reports: EQA Vault',
    description: 'Repository for External Quality Audit reports from certifying bodies (e.g., TUV, AACCUP).',
    steps: [
      { title: 'Partner Reports', desc: 'Review findings from external assessors and third-party quality partners.' },
      { title: 'Compliance Prep', desc: 'Reference these reports when preparing for re-certification surveys.' }
    ],
    buttons: [
        { label: 'External', labelShort: 'View', action: 'Loads official reports from external quality bodies.' }
    ]
  },
  '/qa-reports?tab=mr': {
    title: 'QA Reports: Management Review',
    description: 'Log of institutional review sessions and official meeting minutes.',
    steps: [
      { title: 'Session History', desc: 'Select a session from the sidebar to view its specific decisions and outputs.' },
      { title: 'Open Minutes', desc: 'Click the minutes link to access the signed record of the session proceedings.' }
    ],
    buttons: [
        { label: 'New Session', labelShort: 'Add', action: 'Registers a new MR meeting into the system.' }
    ]
  },

  // --- ACTIVITY LOG ---
  '/activity-log': {
    title: 'Activity Registry Hub',
    description: 'Official logbook for recording daily institutional tasks and WFH accomplishments.',
    steps: [
      { title: 'Select Log Type', desc: 'Use the sub-tabs to switch between standard Office work and remote WFH sheets.' },
      { title: 'Log Activity', desc: 'Click the primary action button to record a new task with its corresponding output.' },
      { title: 'Verify Records', desc: 'Heads: Use the "Verify" buttons to authenticate unit accomplishments for the month.' }
    ],
    buttons: [
      { label: 'Log Task', labelShort: 'Log', action: 'Opens the entry form for daily office activities.' },
      { label: 'Generate Sheet', labelShort: 'Form', action: 'Launches the report wizard for WFH signatories.' }
    ],
    nextStep: 'Log your tasks daily to ensure your Monthly Accomplishment Report is accurate for payroll or audit.'
  },

  // --- AUDIT Conduct / IQA Hub ---
  '/audit': {
    title: 'Internal Quality Audit Hub',
    description: 'Oversight of institutional audit frameworks and itinerary fulfillment.',
    steps: [
      { title: 'Audit Intelligence', desc: 'Review high-level analytics and finding distribution for the selected year.' },
      { title: 'Manage Itinerary', desc: 'Switch to the "Registry" tab to provision unit sessions and assign auditors.' }
    ],
    buttons: [
        { label: 'Audit Year', labelShort: 'Year', action: 'Scopes the entire audit hub to a specific fiscal cycle.' },
        { label: 'New Plan', labelShort: 'Plan', action: 'Starts a new institutional audit framework.' }
    ]
  },
  '/audit?tab=analytics': {
    title: 'Audit: Analytics',
    description: 'Strategic visual decision support for internal quality assurance.',
    steps: [
      { title: 'Monitor Gaps', desc: 'Review the "Unit Finding Hotspots" to identify offices with open non-conformances.' },
      { title: 'Check Coverage', desc: 'Analyze the "Clause Audit Density" to see which ISO requirements are being prioritized.' }
    ],
    buttons: [
        { label: 'Print Registry', labelShort: 'Print', action: 'Generates the official Auditor Assignment Registry PDF.' }
    ]
  },
  '/audit?tab=registry': {
    title: 'Audit: Itinerary Registry',
    description: 'Management of official IQA plans and individual session scheduling.',
    steps: [
      { title: 'Provision Entry', desc: 'Click "Add Entry" on a plan to schedule a unit session with specific ISO clauses.' },
      { title: 'Framework Clone', desc: 'Use "Clone Plan" to replicate successful audit frameworks across different campuses.' }
    ],
    buttons: [
        { label: 'Add Entry', labelShort: 'Add', action: 'Schedules a specific unit/office for audit conduct.' },
        { label: 'Consolidate', labelShort: 'Report', action: 'Generates the unified institutional IQA report summary.' }
    ]
  },

  // --- MANUALS & POLICY ---
  '/manuals': {
    title: 'Procedure Manuals',
    description: 'Institutional operating guidelines and unit-specific procedures.',
    steps: [
      { title: 'Index Search', desc: 'Use the sidebar or search bar to find a specific unit\'s manual.' },
      { title: 'Verify Revision', desc: 'Check the revision badge to ensure you are referencing the latest approved version.' }
    ],
    buttons: [
        { label: 'Preview', labelShort: 'View', action: 'Loads the PDF preview within the portal.' }
    ]
  },
  '/eoms-policy-manual': {
    title: 'RSU EOMS Manual',
    description: 'The primary quality management document aligned with ISO 21001:2018.',
    steps: [
      { title: 'Select Section', desc: 'Choose a policy section from the Table of Contents to view its specific standards.' },
      { title: 'Standard Compliance', desc: 'Refer to these sections for guidance on institutional quality requirements.' }
    ],
    buttons: [
        { label: 'Section', labelShort: 'Open', action: 'Loads the official policy document for review.' }
    ]
  },

  // --- SYSTEM SETTINGS ---
  '/settings': {
    title: 'System Administration',
    description: 'Global configuration and institutional hierarchy management.',
    steps: [
      { title: 'Select Parameter', desc: 'Use the top tabs to manage Users, Campuses, Units, or Registry Cycles.' },
      { title: 'Apply Changes', desc: 'Ensure you click "Save" or "Update" after modifying system-wide parameters.' }
    ]
  },
  '/settings?tab=users': {
    title: 'Settings: User Management',
    description: 'Verification and access control for university personnel.',
    steps: [
      { title: 'Activation', desc: 'Approve pending registrations to grant portal access.' },
      { title: 'Profile Edit', desc: 'Admins can correct institutional assignments (Campus/Role) for any user.' }
    ],
    buttons: [
        { label: 'Activate', labelShort: 'Auth', action: 'Grants full portal access to the user.' }
    ]
  },
  '/settings?tab=backups': {
    title: 'Settings: Data & Backups',
    description: 'Institutional redundancy and audit trail maintenance.',
    steps: [
      { title: 'Full Snapshot', desc: 'Download a complete multi-sheet XLSX of every system registry.' },
      { title: 'Audit Trail', desc: 'Export the permanent log of all user deletions and verification events.' }
    ],
    buttons: [
        { label: 'Download Total', labelShort: 'Export', action: 'Generates the high-density Excel backup workbook.' }
    ]
  }
};
