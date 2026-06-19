'use client';

/**
 * @fileOverview Rich step-by-step guidance data for RSU EOMS Portal modules.
 * This registry powers the PageGuidance sidebar and updates dynamically via route + tab detection.
 */

export interface PageHelp {
  title: string;
  description: string;
  steps: { title: string; desc: string }[];
  buttons?: { label: string; action: string; labelShort?: string }[];
  nextStep?: string;
  alert?: string;
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
    description: 'Real-time EOMS Executive Health Index, Campus Standings, and Quality Insights.',
    steps: [
      { title: 'EOMS Health Index', desc: 'Monitor the composite quality score and its dynamic quality insights/bottlenecks.' },
      { title: 'Campus/Dept Standings', desc: 'Compare verified EOMS submission compliance across physical sites or departments.' },
      { title: 'Strategic SWOT', desc: 'Analyze derived institutional Strengths and Weaknesses right below the scores.' },
      { title: 'Pillars & Bottlenecks', desc: 'Review individual QMS pillar scores and address high-priority alert cards.' }
    ],
    buttons: [
      { label: 'View Year', labelShort: 'Year', action: 'Filters all dashboard metrics and trends to the selected year.' },
      { label: 'Conduct IQA', labelShort: 'IQA', action: 'Direct shortcut link to the Internal Quality Audit hub.' }
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
    description: 'Long-term trends and institutional quality maturity profiling.',
    steps: [
      { title: 'Radar Profile', desc: 'Analyze balance across the 5 core EOMS quality pillars.' },
      { title: 'Trend Velocity', desc: 'Monitor Compliance Over Time to track institutional adoption.' },
      { title: 'Risk Funnel', desc: 'Verify the movement of raw threats into controlled/mitigated factors.' }
    ],
    buttons: [
      { label: 'Maturity Radar', labelShort: 'Radar', action: 'Visual map of quality assurance balance.' }
    ]
  },
  '/dashboard?tab=ched-programs': {
    title: 'Dashboard: CHED Programs',
    description: 'Academic program compliance tracking and Certificate of Program Compliance (COPC) metrics.',
    steps: [
      { title: 'COPC Audit Rate', desc: 'Monitor the percentage of degree programs holding valid CHED COPCs.' },
      { title: 'Faculty Alignment', desc: 'Verify faculty member qualifications against official CMO standards.' },
      { title: 'AACCUP Status', desc: 'Track accreditation progress and survey cycles for all registered programs.' }
    ],
    buttons: [
      { label: 'Filter Year', labelShort: 'Year', action: 'Narrows compliance data to the selected academic period.' }
    ]
  },
  '/dashboard?tab=risk-opportunity': {
    title: 'Dashboard: Risks & Opportunities',
    description: 'Visualization of identified quality threats, opportunities, and mitigation velocity.',
    steps: [
      { title: 'Risk Control Index', desc: 'Track the ratio of mitigated and closed risk registers for the current year.' },
      { title: 'Pre/Post Treatment', desc: 'Verify that residual risk rankings have successfully decreased to low levels.' },
      { title: 'Strategic Register', desc: 'Review the master table of active threats to prioritize mitigation efforts.' }
    ],
    buttons: [
      { label: 'Log Risk', labelShort: 'New', action: 'Shortcut to log a new risk entry into the digital register.' }
    ]
  },
  '/dashboard?tab=corrective-actions': {
    title: 'Dashboard: Corrective Actions',
    description: 'Oversight of the institutional corrective action request (CAR) pipeline and bottlenecks.',
    steps: [
      { title: 'Pipeline Backlog', desc: 'Review status breakdowns (Open, Awaiting Response, For Verification, Closed).' },
      { title: 'Aging & Overdue', desc: 'Identify critical open CARs exceeding the 90-day QMS verification limit.' },
      { title: 'Top Units Workload', desc: 'Track departments with the highest corrective action burden to allocate assistance.' }
    ],
    buttons: [
      { label: 'Print CARs', labelShort: 'Print', action: 'Generates the consolidated corrective action register report.' }
    ]
  },
  '/dashboard?tab=actionable-decisions': {
    title: 'Dashboard: Actionable Decisions',
    description: 'Implementation status of actionable directives from Management Reviews (MR).',
    steps: [
      { title: 'MR Task Progress', desc: 'Monitor open, ongoing, and completed tasks assigned to campuses/units.' },
      { title: 'Timeline Triage', desc: 'Identify pending review decisions that are past their target resolution dates.' },
      { title: 'Sync Evidence', desc: 'Confirm unit accomplishments are supported by appropriate evidence uploads.' }
    ],
    buttons: [
      { label: 'New Session', labelShort: 'Add', action: 'Registers a new Management Review session in the database.' }
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
      { title: 'Search Units', desc: 'Find forms by code (e.g. QAO-01) or official title.' },
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
  '/submissions/new': {
    title: 'Document Upload Wizard',
    description: 'Provisioning official evidence logs for institutional verification.',
    alert: 'FINAL ROR NOTICE: Final Cycle submissions for the Risk & Opportunity Registry will be BLOCKED unless all digital entries for the year are updated with a Post-Treatment analysis.',
    steps: [
      { title: 'Link Validation', desc: 'Paste the GDrive link. The system will automatically check if the Quality Assurance Office has access.' },
      { title: 'Compliance Checklist', desc: 'Final versions require manual confirmation of Year, Cycle, and Signatures.' },
      { title: 'Revision Control', desc: 'Re-uploading for the same year/cycle will automatically increment the Revision (Rev 00, 01, etc.).' }
    ],
    buttons: [
      { label: 'How to get link?', labelShort: 'Help', action: 'Displays the 7-step guide for correct Google Drive sharing.' }
    ]
  },

  // --- RISK REGISTER ---
  '/risk-register': {
    title: 'Risk Management Registry',
    description: 'A digital tool for proactive institutional governance. Log and mitigate vulnerabilities.',
    alert: 'ODIMO NOTICE: Only the Unit Coordinator is authorized to input data to this digital Registry. This ensures coordinators maintain full ownership and awareness of their unit\'s identified risks.',
    steps: [
      { title: 'Step 1: Identify Factor', desc: 'Select Risk (Threat) or Opportunity (Gain) and describe the process objective.' },
      { title: 'Step 2: Initial Analysis', desc: 'Rate Likelihood and Consequence. Ratings of 5-25 trigger a mandatory Action Plan requirement.' },
      { title: 'Step 3: Treatment Action', desc: 'Provide an actionable mitigation strategy. Use the "AI Suggest" button for professional ISO-aligned advice.' },
      { title: 'Step 4: Post-Treatment Audit', desc: 'DURING FINAL CYCLE: Update the "Residual Likelihood/Consequence" based on your actual implementation evidence.' }
    ],
    buttons: [
      { label: 'Log New Entry', labelShort: 'Log', action: 'Starts the risk identification and analysis form.' },
      { label: 'AI Suggest', labelShort: 'AI', action: 'Generates professional mitigation strategies based on your description.' },
      { label: 'Apply & Sync', labelShort: 'Save', action: 'Commits your analysis to the institutional database.' }
    ],
    nextStep: 'Final Cycle ROR documents cannot be submitted until all digital entries here are updated with Section 4 (Post-Treatment).'
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

  // --- COMMUNICATIONS ---
  '/communications': {
    title: 'Communications Logbook',
    description: 'Central management registry for official digital and physical correspondence, including QA Advisories and directives.',
    steps: [
      { title: 'Log or Send', desc: 'Log hardcopy documents under the "Manual Registry Log" or dispatch digital alerts using "Direct Digital Send".' },
      { title: 'Track Correspondence', desc: 'Browse incoming and outgoing logs to trace official document routes.' },
      { title: 'QA Advisories', desc: 'Access published QA directives and official communications from the Quality Assurance Office.' },
      { title: 'Print Logbooks', desc: 'Generate high-fidelity, printable RSU-standard logbook formats for physical filing.' }
    ],
    buttons: [
      { label: 'Log/Send', labelShort: 'New', action: 'Opens the workspace to register a new communication record.' },
      { label: 'Print Incoming', labelShort: 'Print', action: 'Generates the print-ready incoming correspondence logbook.' },
      { label: 'Print Outgoing', labelShort: 'Print', action: 'Generates the print-ready outgoing correspondence logbook.' }
    ]
  },
  '/communications?tab=incoming': {
    title: 'Incoming Communications',
    description: 'Register and stamp official correspondences received from other units, campuses, or external agencies.',
    steps: [
      { title: 'Review Alerts', desc: 'Unread or newly received communications display a prominent status indicator.' },
      { title: 'Receive Action', desc: 'For digital correspondence marked as "Pending Receipt", click "Receive" to stamp local receiving codes.' },
      { title: 'Open Attachment', desc: 'Access the shared Google Drive link to view the official scanned PDF copy.' }
    ],
    buttons: [
      { label: 'Receive & Stamp', labelShort: 'Recv', action: 'Opens the stamp dialog to assign local receipt dates and tracking numbers.' },
      { label: 'Open Drive', labelShort: 'Drive', action: 'Opens the cloud-hosted document scan file in a new tab.' }
    ]
  },
  '/communications?tab=outgoing': {
    title: 'Outgoing Communications',
    description: 'Track all official correspondences dispatched from your office to academic units, campuses, or individual system recipients.',
    steps: [
      { title: 'Recipient Scope', desc: 'Verify recipient tags to ensure documents were correctly routed to target departments or individuals.' },
      { title: 'Origin Trace', desc: 'Use original reference codes (Orig. Ref) to audit and trace the document lifecycle.' },
      { title: 'Registry Log', desc: 'Direct digital sends show target departments; manual logs show destination text.' }
    ],
    buttons: [
      { label: 'Edit Record', labelShort: 'Edit', action: 'Modifies the metadata, subject, or links of an existing log.' },
      { label: 'Delete Record', labelShort: 'Del', action: 'Removes the registry entry from the database (restricted to admin/ODIMO).' }
    ]
  },

  // --- SYSTEM SETTINGS ---
  '/settings': {
    title: 'System Administration',
    description: 'Global configuration and institutional hierarchy management.',
    steps: [
      { title: 'Select Parameter', desc: 'Use the horizontal scrolling tabs to manage Users, Campuses, Units, or Registry Cycles.' },
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
  '/settings?tab=logo': {
    title: 'Settings: Institutional Branding',
    description: 'Configure the university logo used in headers and printed reports.',
    steps: [
      { title: 'Provide URL', desc: 'Enter a valid image URL or Google Drive direct link.' },
      { title: 'Preview', desc: 'Verify the logo appears correctly in the live preview circle.' }
    ]
  },
  '/settings?tab=signatories': {
    title: 'Settings: Official Signatories',
    description: 'Establish the authorized names for official university notices.',
    steps: [
      { title: 'Set Authority', desc: 'Input the current Director and QMS unit heads.' },
      { title: 'Global Update', desc: 'Saving here updates signatures across all printed audit and compliance reports.' }
    ]
  },
  '/settings?tab=gad': {
    title: 'Settings: GAD Governance',
    description: 'Designate the institutional GAD leadership unit.',
    steps: [
      { title: 'Assign Office', desc: 'Select the primary GAD office responsible for university-wide reporting.' },
      { title: 'Global Oversight', desc: 'Users in this unit will be granted oversight permissions in the GAD Corner.' }
    ]
  },
  '/settings?tab=campuses': {
    title: 'Settings: Site Registry',
    description: 'Manage the official list of university campuses.',
    steps: [
      { title: 'Register Site', desc: 'Add new physical campuses or extension sites to the system.' },
      { title: 'Location Map', desc: 'Ensure geographic locations are accurate for regional reporting.' }
    ]
  },
  '/settings?tab=units': {
    title: 'Settings: Unit Registry',
    description: 'Global management of all academic and administrative offices.',
    steps: [
      { title: 'Categorize', desc: 'Assign units as Academic, Admin, Research, or Support for proper grouping.' },
      { title: 'Site Mapping', desc: 'Link units to one or more campuses where they operate.' }
    ]
  },
  '/settings?tab=unit-grouping': {
    title: 'Settings: Unit Explorer',
    description: 'Institutional view of unit distribution across categories and sites.',
    steps: [
      { title: 'Audit Scoping', desc: 'Use this explorer to verify unit clusters when planning audit itineraries.' },
      { title: 'Parity Review', desc: 'Identify how many entities are registered in each process category.' }
    ]
  },
  '/settings?tab=roles': {
    title: 'Settings: Permission Roles',
    description: 'Manage institutional roles and access levels.',
    steps: [
      { title: 'Define Role', desc: 'Create or modify system roles like "Campus Director" or "Unit Coordinator".' },
      { title: 'Access Bound', desc: 'Roles determine the visibility of modules and action buttons for users.' }
    ]
  },
  '/settings?tab=advisories': {
    title: 'Settings: QA Advisories',
    description: 'Management of official communications and directives.',
    steps: [
      { title: 'Draft Advisory', desc: 'Log a new directive with a standardized control number.' },
      { title: 'Set Scope', desc: 'Choose between University-Wide or Unit-Specific accessibility.' }
    ]
  },
  '/settings?tab=procedure-manuals': {
    title: 'Settings: Manual Registry',
    description: 'Link official procedures to unit profiles.',
    steps: [
      { title: 'Update Links', desc: 'Provide the GDrive reference for a unit\'s operating procedure.' },
      { title: 'Revision Control', desc: 'Record the latest approved revision number and implementation date.' }
    ]
  },
  '/settings?tab=eoms-policy-manual': {
    title: 'Settings: EOMS Policy Manual',
    description: 'Manage the 10 core sections of the RSU EOMS Manual.',
    steps: [
      { title: 'Configure Section', desc: 'Input the metadata (Title, Revision, Pages) for each manual chapter.' },
      { title: 'Publish', desc: 'Updating a section makes it immediately available in the EOMS Manual module.' }
    ]
  },
  '/settings?tab=cycles': {
    title: 'Settings: Cycles & Deadlines',
    description: 'Management of official EOMS submission periods.',
    steps: [
      { title: 'Establish Window', desc: 'Define the Start and End dates for First and Final cycles.' },
      { title: 'Audit Year', desc: 'Create cycles for upcoming years to enable forward planning.' }
    ]
  },
  '/settings?tab=campus-settings': {
    title: 'Settings: Campus Specifics',
    description: 'Override parameters and announcements for specific sites.',
    steps: [
      { title: 'Select Campus', desc: 'Choose a target site to modify its local settings.' },
      { title: 'Directives', desc: 'Post campus-only announcements to the home dashboards of relevant users.' }
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
  },
  '/settings?tab=error-reports': {
    title: 'Settings: Error Diagnostics',
    description: 'Monitoring system stability and user-reported issues.',
    steps: [
      { title: 'Review Logs', desc: 'Inspect stack traces and URLs for reported runtime errors.' },
      { title: 'Triage', desc: 'Update status to "Acknowledged" or "Resolved" during debugging.' }
    ]
  },

  // --- SUBMISSIONS DETAIL ---
  '/submissions/[id]': {
    title: 'Submission Quality Audit & History',
    description: 'Detailed compliance review and revision trail for a specific EOMS document.',
    steps: [
      { title: 'Review File Revisions', desc: 'Browse the uploaded documents under "Audit Trail". Revisions increment automatically (Rev 00, 01, etc.).' },
      { title: 'Check Feedback & Comments', desc: 'View feedback from your campus Director or QA auditors in the discussion thread.' },
      { title: 'Status Assessment', desc: 'Verify the document\'s verification phase: Draft Checked, Approved, or Needs Revision.' }
    ],
    buttons: [
      { label: 'View Link', labelShort: 'Open', action: 'Opens the underlying document in Google Drive.' },
      { label: 'Submit Revision', labelShort: 'Upload', action: 'Uploads a replacement revision to clear rejection notes.' }
    ]
  },

  // --- AUDIT CONDUIT DETAIL ---
  '/audit/[scheduleId]': {
    title: 'IQA Execution Checklist',
    description: 'Auditor workspace for conducting field audits, logging evidence, and registering findings.',
    steps: [
      { title: 'Verify Details', desc: 'Confirm unit name, scheduled date, and assigned auditor team details.' },
      { title: 'Checklist Execution', desc: 'Review individual ISO clauses. Check off items based on verified physical or digital records.' },
      { title: 'Record Observations', desc: 'Input auditor remarks, recommendations (OFI), or non-conformances (NC) directly under each item.' },
      { title: 'Sync Registry', desc: 'Click "Save Progress" to mirror data. If offline, the portal caches changes locally.' }
    ],
    buttons: [
      { label: 'Save Draft', labelShort: 'Save', action: 'Caches current checklist scores without closing the audit session.' },
      { label: 'Complete Audit', labelShort: 'Submit', action: 'Locks the checklist and pushes final records to the QA register.' },
      { label: 'Generate PDF', labelShort: 'Print', action: 'Generates the official Folio-sized Evidence Log Sheet.' }
    ]
  },

  // --- AUDIT CAP FINDING DETAIL ---
  '/audit/cap/[findingId]': {
    title: 'Corrective Action Plan (CAP) Console',
    description: 'A tool for non-conformance root cause analysis and corrective action formulation.',
    steps: [
      { title: 'Understand Finding', desc: 'Review the details of the non-conformance (NC) recorded by the auditor.' },
      { title: 'Root Cause Analysis', desc: 'Explain why the breakdown occurred. Use 5-Why analysis to identify institutional gaps.' },
      { title: 'Formulate Action Plan', desc: 'Define correction steps and assign target dates with responsible personnel.' },
      { title: 'Submit Evidence', desc: 'Upload the corrective plan and verify implementation progress.' }
    ],
    buttons: [
      { label: 'Propose CAP', labelShort: 'Submit', action: 'Submits the corrective actions list for Auditor verification.' },
      { label: 'Acknowledge', labelShort: 'Verify', action: 'Auditor: Confirms the proposed actions address the root cause.' }
    ]
  },

  // --- ACADEMIC PROGRAM DETAIL ---
  '/academic-programs/[programId]': {
    title: 'Program Compliance Dashboard',
    description: 'Detailed compliance registry and survey roadmap for a specific degree offering.',
    steps: [
      { title: 'CMO Standards', desc: 'Verify program authority (CHED COPC status and Board of Regents resolutions).' },
      { title: 'Accreditation status', desc: 'Track AACCUP survey levels and target roadmap dates.' },
      { title: 'Faculty Census', desc: 'Check Sex-Disaggregated faculty profiles, titles, and academic alignments.' }
    ],
    buttons: [
      { label: 'Edit Metadata', labelShort: 'Edit', action: 'Allows coordinators to update program codes or description.' },
      { label: 'Accreditation', labelShort: 'Level', action: 'Opens the detail checklist for the current AACCUP profile.' }
    ]
  },

  // --- VISITOR LOGBOOK ---
  '/visitor-logbook': {
    title: 'Visitor Logbook Registry',
    description: 'On-site logbook for campuses and offices to maintain institutional safety and service history.',
    steps: [
      { title: 'Record Purpose', desc: 'Document name, contact details, organization, and clear purpose of visit.' },
      { title: 'Assign Target Office', desc: 'Select the destination department. Campus Directors & Odimos use "OFFICE OF THE CAMPUS DIRECTOR".' },
      { title: 'Time Tracking', desc: 'Log check-in times and update check-out status upon visit completion.' }
    ],
    buttons: [
      { label: 'Record Visit', labelShort: 'Log', action: 'Opens the visitor registration popup.' },
      { label: 'Check-out', labelShort: 'Exit', action: 'Stamps check-out time and updates visit status.' }
    ]
  },

  // --- SOFTWARE QUALITY ---
  '/software-quality': {
    title: 'ISO/IEC 25010 Software Evaluation',
    description: 'User evaluation console for quality in use, usability, and operational efficiency.',
    steps: [
      { title: 'Quality Pillars', desc: 'Rate portal metrics: Functional Suitability, Performance Efficiency, Usability, Security.' },
      { title: 'Provide Scoring', desc: 'Select ratings from 1 (Poor) to 5 (Excellent) based on your operational experience.' },
      { title: 'Submit Review', desc: 'Complete the feedback form to help CRAIITech optimize system response.' }
    ],
    buttons: [
      { label: 'Submit Evaluation', labelShort: 'Save', action: 'Saves your evaluation profile to the central registry.' }
    ]
  },

  // --- FACULTY EVALUATION ---
  '/faculty-evaluation': {
    title: 'Faculty CMO Quality Audit',
    description: 'Curriculum-aligned evaluation of teaching personnel against CHED regulatory mandates.',
    steps: [
      { title: 'Staff Index', desc: 'Review the list of faculty members mapped to your academic program.' },
      { title: 'Verify Standards', desc: 'Ensure qualifications (Master\'s/Doctorate degrees, specialization alignment) are updated.' },
      { title: 'Resolve Flags', desc: 'Address any program alignment issues noted during internal reviews.' }
    ]
  },

  // --- PROFILE & ACCESSIBILITY ---
  '/profile': {
    title: 'Account Settings & Accessibility',
    description: 'Manage personal credentials and toggle accessibility options (PWD support).',
    steps: [
      { title: 'Identity Controls', desc: 'Update your display name. Institutional roles and office assignments remain locked.' },
      { title: 'Accessibility Features', desc: 'Toggle Dyslexic Font, High Contrast colors, and scaling factors for comfort.' },
      { title: 'Security Credentials', desc: 'Update passwords or trigger Data Privacy account erasure if needed.' }
    ],
    buttons: [
      { label: 'Save Settings', labelShort: 'Save', action: 'Commits accessibility profiles and display updates.' },
      { label: 'Danger Zone', labelShort: 'Delete', action: 'Permits account termination under RA 10173 Right to Erasure.' }
    ]
  },

  // --- APPROVALS QUEUE ---
  '/approvals': {
    title: 'Approvals Registry Queue',
    description: 'Supervisor console for reviewing and signing off on unit compliance submissions.',
    steps: [
      { title: 'Audit Queue', desc: 'View pending files submitted by units under your site or campus jurisdiction.' },
      { title: 'Document Verification', desc: 'Open and review EOMS files (SWOT, Risk Registers, OpPlans) for accuracy.' },
      { title: 'Status Determination', desc: 'Mark files as Approved to complete compliance steps, or Reject with corrective notes.' }
    ],
    buttons: [
      { label: 'Approve Submission', labelShort: 'Accept', action: 'Saves status as Approved, updating unit maturity metric.' },
      { label: 'Reject Submission', labelShort: 'Return', action: 'Sets status to Rejected and requests unit corrections.' }
    ]
  },

  // --- UNIT ACTIVITY ATTENDANCE & DOCUMENTATION ---
  '/unit-activity': {
    title: 'Unit Activity Attendance & Documentation',
    description: 'Central registry for units to plan activities, upload Google Drive links, configure multi-session attendance schedules, and review analytics.',
    steps: [
      { title: 'Register Activity', desc: 'Create a new activity with description, dates, target unit, and dynamic sessions.' },
      { title: 'Attach CSW Documents', desc: 'Click the "+" button to link Google Drive files (Proposal, Terminal Report) with text descriptions.' },
      { title: 'Configure Sessions', desc: 'Define individual sessions (Day 1 AM/PM, Day 2, etc.) and check-in options.' },
      { title: 'Decision Support', desc: 'Access the Decision Support tab to view Recharts visualizations of attendee punctuality, sex demographics, and evaluations.' }
    ],
    buttons: [
      { label: 'Create Activity', labelShort: 'Create', action: 'Opens the wizard to create a new activity with multi-session schedules.' },
      { label: 'Attach Document', labelShort: '+ Doc', action: 'Appends a new Google Drive documentation link to the activity.' }
    ]
  },
  '/unit-activity-scanner': {
    title: 'Unit Activity Attendance Scanner',
    description: 'Real-time terminal to scan participant QR codes, choose active session windows, and display feedback QR codes.',
    steps: [
      { title: 'Select Session', desc: 'Pick the current active session (e.g. Day 1 AM) from the dropdown selector.' },
      { title: 'Scan QR Codes', desc: 'Scan participant QR codes to stamp their attendance (login/logout times).' },
      { title: 'Evaluation QR Overlay', desc: 'Open the Full Screen display or download the generated QR code to collect participant feedback.' }
    ],
    buttons: [
      { label: 'Change Session', labelShort: 'Session', action: 'Changes the active registration session window.' },
      { label: 'Display Evaluation QR', labelShort: 'QR Code', action: 'Opens a fullscreen modal with the Evaluation Portal QR code.' }
    ]
  },
  '/unit-activity/evaluate': {
    title: 'Activity Evaluation Portal',
    description: 'Participant feedback terminal to evaluate activity objectives, speakers, organization/venue, and leave comments.',
    steps: [
      { title: 'Identify Yourself', desc: 'Optionally provide your name and contact details (submissions can be anonymous).' },
      { title: 'Provide Ratings', desc: 'Rate Objectives Met, Speaker Performance, and Venue/Organization quality from 1 to 5 stars.' },
      { title: 'Leave Feedback', desc: 'Type constructive remarks in the comments text area and submit the review.' }
    ],
    buttons: [
      { label: 'Submit Feedback', labelShort: 'Submit', action: 'Registers your responses in the QMS activity evaluation database.' }
    ]
  },

  // --- STRATEGIC DASHBOARD ---
  '/strategic': {
    title: 'Strategic Dashboard Hub',
    description: 'Long-term institutional quality planning, trend analysis, and maturity profiling.',
    steps: [
      { title: 'Radar Profile', desc: 'Analyze balance across the 5 core EOMS quality pillars at a glance.' },
      { title: 'Trend Velocity', desc: 'Monitor Compliance Over Time to track institutional adoption rates.' },
      { title: 'Risk Funnel', desc: 'Verify the movement of raw threats into controlled or mitigated factors.' }
    ],
    buttons: [
      { label: 'Maturity Radar', labelShort: 'Radar', action: 'Visual map of quality assurance balance across pillars.' }
    ]
  },

  // --- REPORTS ---
  '/reports': {
    title: 'Reports & Analytics Center',
    description: 'Centralized institutional report generation and data export hub.',
    steps: [
      { title: 'Select Report', desc: 'Choose from available institutional report templates and data summaries.' },
      { title: 'Configure Filters', desc: 'Set year, campus, or unit parameters to narrow the report scope.' },
      { title: 'Export or Print', desc: 'Download generated reports in Excel or generate print-ready PDFs.' }
    ],
    buttons: [
      { label: 'Generate Report', labelShort: 'Generate', action: 'Builds the report based on selected parameters.' },
      { label: 'Export XLSX', labelShort: 'Export', action: 'Downloads the report as an Excel workbook.' }
    ]
  },

  // --- SYSTEM AUDIT LOG ---
  '/audit-log': {
    title: 'System Audit Log',
    description: 'Permanent record of all system modifications, user deletions, and administrative actions.',
    steps: [
      { title: 'Review Events', desc: 'Browse the chronological list of system transactions and user actions.' },
      { title: 'Filter Records', desc: 'Use search and date filters to narrow down specific events or time periods.' },
      { title: 'Export Trail', desc: 'Download the complete audit log for external quality audit evidence.' }
    ],
    buttons: [
      { label: 'Export Log', labelShort: 'Export', action: 'Generates a timestamped Excel backup of the audit trail.' }
    ]
  },

  // --- VISITOR LOGBOOK SETTINGS ---
  '/visitor-logbook/settings': {
    title: 'CSM Settings & Configuration',
    description: 'Configure Client Service Management (CSM) parameters, visitor log fields, and login/purpose options.',
    steps: [
      { title: 'Customize Fields', desc: 'Add or modify the list of purposes, offices, and login options for the visitor logbook.' },
      { title: 'Set Defaults', desc: 'Configure default target offices and timezone settings for check-in operations.' },
      { title: 'Review Log', desc: 'Browse the master visitor log from the CSM kiosk or mobile portal.' }
    ],
    buttons: [
      { label: 'Save Settings', labelShort: 'Save', action: 'Commits CSM configuration changes to the database.' }
    ]
  }
};

/**
 * Resolves the appropriate help content block based on the current pathname and query params.
 * Supports exact paths, tab contexts, and dynamic route parameter patterns.
 */
export function getHelpForPath(pathname: string, activeTab?: string | null): PageHelp | null {
  // 1. Exact path with tab parameter
  if (activeTab) {
    const pathWithTab = `${pathname}?tab=${activeTab}`;
    if (helpContent[pathWithTab]) return helpContent[pathWithTab];
  }

  // 2. Exact pathname
  if (helpContent[pathname]) return helpContent[pathname];

  // 3. Dynamic route matches
  const segments = pathname.split('/');

  // Submissions dynamic ID: /submissions/[id]
  if (segments.length === 3 && segments[1] === 'submissions' && segments[2] !== 'new') {
    return helpContent['/submissions/[id]'];
  }

  // Audit dynamic ID: /audit/[scheduleId]
  if (segments.length === 3 && segments[1] === 'audit') {
    return helpContent['/audit/[scheduleId]'];
  }

  // Corrective Action Plan: /audit/cap/[findingId]
  if (segments.length === 4 && segments[1] === 'audit' && segments[2] === 'cap') {
    return helpContent['/audit/cap/[findingId]'];
  }

  // Academic Program details: /academic-programs/[programId]
  if (segments.length === 3 && segments[1] === 'academic-programs') {
    return helpContent['/academic-programs/[programId]'];
  }

  // 4. General parent path fallback
  const parentPath = `/${segments[1]}`;
  if (helpContent[parentPath]) return helpContent[parentPath];

  return null;
}

