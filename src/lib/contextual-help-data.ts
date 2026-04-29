/**
 * @fileOverview Rich step-by-step guidance data for RSU EOMS Portal modules.
 * Updated: Added comprehensive Home Dashboard tab-specific guidance.
 */

export interface PageHelp {
  title: string;
  description: string;
  steps: { title: string; desc: string }[];
  buttons: { label: string; action: string }[];
  nextStep?: string;
}

export const helpContent: Record<string, PageHelp> = {
  '/dashboard': {
    title: 'Dashboard: Overview',
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
    description: 'Summary of active quality milestones, audit itineraries, and recent documentation activity.',
    steps: [
      { title: 'Evaluate SWOT', desc: 'Review the automated Strategic SWOT to see strengths and gaps derived from your data.' },
      { title: 'Audit Itinerary', desc: 'Check for upcoming Internal Quality Audit (IQA) sessions assigned to your scope.' },
      { title: 'Recent Activity', desc: 'Monitor the latest document updates and status transitions in real-time.' }
    ],
    buttons: [
      { label: 'Year Selector', labelShort: 'Year', action: 'Switches the data context for all dashboard components.' },
      { label: 'View Workspace', labelShort: 'Open', action: 'Drills down into specific unit or program compliance details.' }
    ],
    nextStep: 'Use the "Analytics" tab for a deeper dive into submission trends and headcount distribution.'
  },
  '/dashboard?tab=analytics': {
    title: 'Dashboard: Analytics',
    description: 'Data-driven insights into submission schedules, risk posture, and institutional parity.',
    steps: [
      { title: 'Submission Schedule', desc: 'Verify official deadlines for the First and Final submission cycles.' },
      { title: 'Risk Posture', desc: 'Analyze the distribution of High, Medium, and Low risks across your scope.' },
      { title: 'Parity Heatmap', desc: 'Identify specific units with missing documents using the color-coded matrix.' }
    ],
    buttons: [
      { label: 'Status Legend', labelShort: 'Info', action: 'Explains the color coding used in the compliance heatmaps.' },
      { label: 'Year Filter', labelShort: 'AY', action: 'Sets the fiscal context for all quantitative charts.' }
    ],
    nextStep: 'Switch to the "Strategic" tab to view long-term maturity trends and risk matrices.'
  },
  '/dashboard?tab=strategic': {
    title: 'Dashboard: Strategic',
    description: 'High-level visualizations of institutional maturity and long-term quality trends.',
    steps: [
      { title: 'Maturity Radar', desc: 'Analyze balance across Documentation, Risk Management, and Decision Resolution.' },
      { title: 'Compliance Trend', desc: 'Track year-over-year improvement in total institutional documentation parity.' },
      { title: 'Risk Matrix', desc: 'Prioritize intervention based on the Likelihood vs Consequence scatter plot.' },
      { title: 'Treatment Funnel', desc: 'Monitor the lifecycle of threats moving from Identification to Closure.' }
    ],
    buttons: [
      { label: 'Maturity Radar', labelShort: 'Radar', action: 'Visualizes the "shape" of the current quality system.' },
      { label: 'Risk Funnel', labelShort: 'Funnel', action: 'Tracks the conversion of threats into controlled factors.' }
    ],
    nextStep: 'Present these strategic insights during Management Reviews to drive university-wide improvement.'
  },
  '/dashboard?tab=users': {
    title: 'Dashboard: User Directory',
    description: 'Personnel mapping and access oversight for the university units.',
    steps: [
      { title: 'Verify Registration', desc: 'Ensure all assigned Unit Coordinators have active, verified accounts.' },
      { title: 'Map Units', desc: 'Cross-reference personnel with their respective academic or administrative offices.' }
    ],
    buttons: [
      { label: 'User Count', labelShort: 'Users', action: 'Total number of registered personnel in the campus.' }
    ]
  },
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
  '/activity-log?tab=daily': {
    title: 'Employee Activity Log',
    description: 'Daily registry for recording office-based tasks and standard duty accomplishments.',
    steps: [
      { title: 'Log Task', desc: 'Click "Log Task" to record a specific activity performed during office hours.' },
      { title: 'Describe Work', desc: 'Provide a clear "Activity Particular" and define the "Output" achieved.' },
      { title: 'Evidence Link', desc: 'Paste a Google Drive link to verify the work (e.g. signed minutes, reports).' },
      { title: 'Verification', desc: 'Once logged, your immediate supervisor will review and verify the entry.' }
    ],
    buttons: [
      { label: 'Log Task', labelShort: 'Log', action: 'Opens the office activity entry form.' },
      { label: 'Print Current', labelShort: 'Print', action: 'Generates a PDF summary of the filtered list.' },
      { label: 'Monthly Log', labelShort: 'XLSX', action: 'Downloads your complete log for the selected month.' }
    ],
    nextStep: 'Use the "Verify" button (if supervisor) to authenticate your staff\'s daily accomplishments.'
  },
  '/activity-log?tab=wfh': {
    title: 'Work From Home (WFH)',
    description: 'Specialized monitoring sheet for remote work accomplishments and deliverables.',
    steps: [
      { title: 'Log WFH Task', desc: 'Record deliverables approved by your head for remote execution.' },
      { title: 'Appointment Details', desc: 'Ensure your nature of appointment and teaching load (if faculty) are correct.' },
      { title: 'Monitoring Sheet', desc: 'Click "Generate Monitoring Sheet" to produce the official RSU WFH form.' }
    ],
    buttons: [
      { label: 'Log WFH Task', labelShort: 'Home', action: 'Opens the specialized remote work entry form.' },
      { label: 'Generate Monitoring Sheet', labelShort: 'Form', action: 'Launches the report wizard for WFH signatories.' }
    ],
    nextStep: 'Submit your signed WFH Monitoring Sheet to your department head for final validation.'
  },
  '/submissions': {
    title: 'EOMS Submission Hub',
    description: 'The primary workflow for ISO 7.5.3 compliance. Manage the lifecycle of the 6 core EOMS documents.',
    steps: [
      { title: 'Identify Cycle', desc: 'Determine if you are submitting for the First or Final cycle based on the university calendar.' },
      { title: 'New Submission', desc: 'Click the button and select the specific report type (e.g., SWOT, Op Plan).' },
      { title: 'Select Version', desc: 'Choose "Draft" for content checking or "Final" for signed institutional records.' },
      { title: 'Monitor Status', desc: 'Track your document from "Submitted" to "Approved". Address any rejections immediately.' }
    ],
    buttons: [
      { label: 'New Submission', labelShort: 'New', action: 'Starts the multi-step document upload wizard.' },
      { label: 'Download Templates', labelShort: 'Templates', action: 'Accesses the official RSU GDrive for standardized forms.' },
      { label: 'View Record', labelShort: 'View', action: 'Opens the detailed audit trail and preview for a specific doc.' }
    ],
    nextStep: 'Check the "Site Matrix" tab to see how your unit\'s compliance benchmarks against other departments.'
  },
  '/risk-register': {
    title: 'Risk Management Registry',
    description: 'A digital tool for proactive institutional governance. Log and mitigate vulnerabilities.',
    steps: [
      { title: 'Identify Factor', desc: 'Identify a Risk (Threat) or Opportunity (Gain) linked to a process objective.' },
      { title: 'Baseline Analysis', desc: 'Rate the Likelihood and Consequence (1-5). Magnitude 5+ triggers mandatory action.' },
      { title: 'Execute Treatment', desc: 'Assign a person and target date to mitigate the risk. Use "AI Suggest" for help.' },
      { title: 'Closure Audit', desc: 'Once mitigated, provide evidence and update the "Residual Rating" to close the item.' }
    ],
    buttons: [
      { label: 'Log New Entry', labelShort: 'Log', action: 'Starts the risk identification and analysis form.' },
      { label: 'AI Suggest', labelShort: 'AI', action: 'Uses GenAI to propose professional ISO-aligned treatment plans.' },
      { label: 'Print Registry', labelShort: 'Print', action: 'Generates the official ROR form for your unit\'s EOMS binder.' }
    ],
    nextStep: 'Ensure all High-rated risks have a "Closed" status before the final internal quality audit (IQA).'
  },
  '/unit-forms': {
    title: 'Form Control & Registry',
    description: 'Centralized governance for all controlled records used by the university.',
    steps: [
      { title: 'Procure Template', desc: 'Download the official DRF template and define your unit\'s forms.' },
      { title: 'Launch Wizard', desc: 'Apply for registration by uploading the signed DRF and the form links.' },
      { title: 'Review Phase', desc: 'The QA Office and the President will review the contents for standard alignment.' },
      { title: 'Roster Enrollment', desc: 'Once approved, forms are automatically enrolled in your unit\'s official roster.' }
    ],
    buttons: [
      { label: 'Launch Wizard', labelShort: 'Start', action: 'Begins the formal application for new form enrollment.' },
      { label: 'Access Roster', labelShort: 'Roster', action: 'Opens the secure folder containing your latest approved forms.' },
      { label: 'Request Download', labelShort: 'Get', action: 'Logs your name and date as you access a controlled form.' }
    ],
    nextStep: 'Always use the forms from this Roster to ensure you are using the latest approved revision.'
  },
  '/audit': {
    title: 'IQA Strategic Hub',
    description: 'The primary command center for internal quality audit planning and performance analysis.',
    steps: [
      { title: 'Audit Intelligence', desc: 'Use the analytics tab to monitor institutional maturity and auditor workloads.' },
      { title: 'Itinerary Management', desc: 'Switch to the registry tab to provision individual audit sessions for units.' },
      { title: 'Execute Audit', desc: 'Auditors: Click "Open Evidence Log" on your assigned session to begin the ISO 21001 checklist.' }
    ],
    buttons: [
      { label: 'New Audit Plan', labelShort: 'Plan', action: 'Creates a new institutional framework for the year.' },
      { label: 'Claim Audit', labelShort: 'Claim', action: 'Assigns an itinerary entry to your auditor account.' }
    ],
    nextStep: 'Check the "Itinerary Management" tab to schedule your first session.'
  },
  '/audit?tab=analytics': {
    title: 'Audit Intelligence',
    description: 'Institutional performance analytics and auditor workload oversight.',
    steps: [
      { title: 'Monitor KPIs', desc: 'Track total scheduled sessions vs finalized evidence logs.' },
      { title: 'Evaluate SWOT', desc: 'Review strengths and gaps derived from institutional audit data.' },
      { title: 'Check Coverage', desc: 'Analyze which ISO clauses are receiving the most scrutiny in recent audits.' },
      { title: 'Auditor Workload', desc: 'Verify the distribution of sessions among internal auditors to ensure parity.' }
    ],
    buttons: [
      { label: 'Print Assignments', labelShort: 'Print', action: 'Generates a PDF summary of auditor schedules for filing.' },
      { label: 'Year Filter', labelShort: 'Year', action: 'Switches the analytics context between different fiscal cycles.' }
    ],
    nextStep: 'Use these analytics to prepare the Audit Summary for the next Management Review (MR) session.'
  },
  '/audit?tab=registry': {
    title: 'Itinerary Management',
    description: 'The master log of all internal quality audit sessions and schedules.',
    steps: [
      { title: 'Add Entry', desc: 'Click "Add Entry" to provision a new audit session for a specific unit or office.' },
      { title: 'Assign Auditor', desc: 'Modify an entry to assign a specific auditor or leave it unassigned for claiming.' },
      { title: 'Consolidate', desc: 'Use "Consolidate Report" to aggregate all findings into a master institutional record.' },
      { title: 'Clone Plan', desc: 'Quickly replicate successful audit frameworks across different campuses.' }
    ],
    buttons: [
      { label: 'Add Entry', labelShort: 'Add', action: 'Opens the session provisioning form.' },
      { label: 'Consolidate Report', labelShort: 'CAR', action: 'Generates a consolidated institutional audit summary.' },
      { label: 'Clone Plan', labelShort: 'Clone', action: 'Duplicates the plan and itinerary for another site.' }
    ],
    nextStep: 'Once a session is "Completed", click "Open Evidence Log" to review the detailed findings.'
  },
  '/qa-reports': {
    title: 'Institutional QA Vault',
    description: 'Centralized repository for CARs, Management Reviews, and Audit Summary reports.',
    steps: [
      { title: 'CAR Tracking', desc: 'Monitor the resolution status of institutional non-conformances.' },
      { title: 'Review MRs', desc: 'Access the minutes and actionable decisions from top management sessions.' },
      { title: 'Audit Archive', desc: 'Retrieve historical IQA and EQA reports for accreditor verification.' }
    ],
    buttons: [
      { label: 'Issue CAR', labelShort: 'Issue', action: 'Opens the formal non-conformance logging form.' },
      { label: 'Log MR Output', labelShort: 'MR', action: 'Records a management decision into the action registry.' }
    ],
    nextStep: 'Switch to the "Actionable Decisions" tab to see tasks assigned to your specific unit.'
  },
  '/qa-reports?tab=overview': {
    title: 'QA Institutional Overview',
    description: 'Aggregate analytics for the university corrective action and audit lifecycle.',
    steps: [
      { title: 'Review KPIs', desc: 'Monitor the Resolution Rate and Effectiveness Score for all logged CARs.' },
      { title: 'Track Implementation', desc: 'Analyze the trend of management decisions moving from Open to Closed.' },
      { title: 'Maturity Profile', desc: 'See the real-time distribution of quality findings across the university.' }
    ],
    buttons: [
      { label: 'Decision Volume', labelShort: 'Dec.', action: 'Total number of actionable decisions logged in MR.' },
      { label: 'Resolution Rate', labelShort: 'Res.', action: 'Percentage of closed items vs total findings.' }
    ],
    nextStep: 'Check the "CAR Registry" tab to see specific units with outstanding non-conformances.'
  },
  '/qa-reports?tab=decisions': {
    title: 'Actionable Decisions',
    description: 'Tracking the implementation of strategic directives assigned during Management Reviews.',
    steps: [
      { title: 'Monitor Deadlines', desc: 'Check the "Follow-up Date" for each decision assigned to your unit or campus.' },
      { title: 'Update Progress', desc: 'Click "UPDATE" to log actions taken, attach evidence, and move items to Verification.' },
      { title: 'Close Items', desc: 'Admins will verify your updates and formally close the decision entry.' }
    ],
    buttons: [
      { label: 'UPDATE', labelShort: 'Edit', action: 'Opens the progress reporting form for a specific decision.' },
      { label: 'All Sessions', labelShort: 'Year', action: 'Filter decisions by the year of the Management Review session.' }
    ],
    nextStep: 'Ensure all "Verification Pending" items are reviewed by the QA Office before the next EQA.'
  },
  '/qa-reports?tab=car': {
    title: 'CAR Registry (CCR)',
    description: 'The formal record of Corrective Action Requests issued for standard non-conformances.',
    steps: [
      { title: 'Issue CAR', desc: 'Admins: Click "Issue New CAR" to record a formal gap identified in an audit.' },
      { title: 'Root Cause (RCA)', desc: 'Units: Perform an investigation into why the gap occurred before proposing actions.' },
      { title: 'Track Action', desc: 'Monitor the transition from "In Progress" to "Closed" once mitigation is verified.' }
    ],
    buttons: [
      { label: 'Issue New CAR', labelShort: 'Issue', action: 'Opens the formal non-conformance logging form.' },
      { label: 'Print Register', labelShort: 'Print', action: 'Generates the official CAR Control Register (CCR) PDF.' },
      { label: 'MANAGE', labelShort: 'Edit', action: 'Enters the RCA and Action Plan workspace.' }
    ],
    nextStep: 'Units must provide a "Time Limit for Reply" compliant response within the period stated in the CAR.'
  },
  '/academic-programs': {
    title: 'CHED Program Monitoring',
    description: 'Central registry for tracking the 5 quality pillars of university degree offerings.',
    steps: [
      { title: 'Manage Workspace', desc: 'Click "Workspace" to update specific program data for the current year.' },
      { title: 'Batch Data Entry', desc: 'Use the "Batch Data Hub" for rapid headcount and outcomes logging.' },
      { title: 'Quality Strength', desc: 'Review the SWOT derivation to see high-performance program benchmarks.' }
    ],
    buttons: [
      { label: 'Workspace', labelShort: 'Open', action: 'Enters the comprehensive 5-module compliance dashboard.' },
      { label: 'Batch Data Hub', labelShort: 'Batch', action: 'Fast-entry mode for Enrollment, Graduation, and Board stats.' }
    ],
    nextStep: 'Maintain a 100% "Data Integrity Rate" to ensure the university survey roadmap remains accurate.'
  },
  '/academic-programs?tab=analytics': {
    title: 'Decision Support (Analytics)',
    description: 'High-level strategic overview of academic quality and accreditation status.',
    steps: [
      { title: 'Maturity Profile', desc: 'Evaluate program health across the 5 quality pillars (Authority, Accreditation, etc.).' },
      { title: 'Survey Pipeline', desc: 'Review the chronological roadmap of upcoming AACCUP accreditation visits.' },
      { title: 'Accountability', desc: 'Monitor pending accreditor recommendations and their assigned responsible units.' }
    ],
    buttons: [
      { label: 'Print Registry', labelShort: 'Print', action: 'Generates the institutional accountability report for accreditor recos.' },
      { label: 'Compliance Year', labelShort: 'Year', action: 'Filters the roadmap and analytics to a specific academic year.' }
    ],
    nextStep: 'Check the "Gaps Registry" to identify programs requiring immediate documentation updates.'
  },
  '/academic-programs?tab=batch-hub': {
    title: 'Batch Data Hub',
    description: 'Rapid-entry workspace for institutional student and faculty statistics.',
    steps: [
      { title: 'Select Mode', desc: 'Choose between Enrollment, Graduation, Board Exam, or Tracer Study data entry.' },
      { title: 'Identify Program', desc: 'Locate the academic offering in the registry and click "Update" or "Start Log".' },
      { title: 'Sync Data', desc: 'Fill out the disaggregated headcount and click "Apply & Sync" to save.' }
    ],
    buttons: [
      { label: 'Enrollment', labelShort: 'Users', action: 'Switch to student headcount entry mode.' },
      { label: 'Graduation', labelShort: 'Grad', action: 'Switch to degree completion entry mode.' },
      { label: 'Update', labelShort: 'Edit', action: 'Launches the rapid-entry wizard for the selected program.' }
    ],
    nextStep: 'Maintain a 100% "Data Integrity Rate" to ensure university-wide analytics are accurate.'
  },
  '/academic-programs?tab=registry': {
    title: 'Program Registry',
    description: 'The master directory of all degree offerings and their base compliance parameters.',
    steps: [
      { title: 'Register Program', desc: 'Admins can click "Register Program" to add a new offering to the university scope.' },
      { title: 'Manage Status', desc: 'Track COPC status, current accreditation levels, and faculty pool totals.' },
      { title: 'Workspace', desc: 'Click "Workspace" to enter the detailed 5-module compliance dashboard for a specific program.' }
    ],
    buttons: [
      { label: 'Register Program', labelShort: 'New', action: 'Opens the form to add a new academic degree to the system.' },
      { label: 'Workspace', labelShort: 'Open', action: 'Enters the comprehensive compliance management area.' },
      { label: 'Edit', labelShort: 'Edit', action: 'Modify the base parameters (Majors, Campus, Level) of a program.' }
    ],
    nextStep: 'Use the "Workspace" button to upload COPC certificates or accreditation results.'
  },
  '/academic-programs?tab=strengths': {
    title: 'Quality Profile (SWOT)',
    description: 'Automated derivation of institutional strengths and gaps based on verified evidence.',
    steps: [
      { title: 'Review Strengths', desc: 'See verified high-performance areas (e.g. Level IV accreditation or full COPC parity).' },
      { title: 'Monitor Gaps', desc: 'Identify critical documentation deficiencies that impact the institutional maturity index.' },
      { title: 'Strategic Action', desc: 'Prioritize resource allocation to units flagged in the "Gaps Registry".' }
    ],
    buttons: [
      { label: 'Impact', labelShort: 'Zap', action: 'Explains the strategic importance of the identified strength or gap.' },
      { label: 'Category', labelShort: 'Tag', action: 'Categorizes the insight (e.g. Accreditation, Regulatory, Resources).' }
    ],
    nextStep: 'Present these strengths during the next Management Review to promote institutional best practices.'
  },
};
