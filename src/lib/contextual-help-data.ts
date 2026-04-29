
/**
 * @fileOverview Rich step-by-step guidance data for RSU EOMS Portal modules.
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
    title: 'Dashboard Overview',
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
  '/activity-log': {
    title: 'Activity Registry Protocol',
    description: 'Official logbook for recording daily institutional tasks and WFH accomplishments.',
    steps: [
      { title: 'Select Log Type', desc: 'Use "Employee Activity" for office work or "WFH" for remote tasks.' },
      { title: 'Log Task', desc: 'Click "Log Task" and provide specific details including start/end times and outputs.' },
      { title: 'Attach Evidence', desc: 'Paste a Google Drive link to the document or photo verifying the work performed.' },
      { title: 'Generate Report', desc: 'Once verified by your head, click "Print" to generate the official summary.' }
    ],
    buttons: [
      { label: 'Log Task', labelShort: 'Log', action: 'Opens the entry form for daily office activities.' },
      { label: 'Print Report', labelShort: 'Print', action: 'Generates a PDF Accomplishment Report for your file.' },
      { label: 'Verify', labelShort: 'Verify', action: 'For Heads: Authenticates a subordinate\'s task log.' }
    ],
    nextStep: 'Log your tasks daily to ensure your Monthly Accomplishment Report is accurate for payroll or audit.'
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
    title: 'IQA Conduct Workspace',
    description: 'Digital workspace for internal auditors to log evidence and finalize quality reports.',
    steps: [
      { title: 'Claim Itinerary', desc: 'Auditors: Browse the "Available Pool" and claim a session to conduct.' },
      { title: 'Log Evidence', desc: 'During the audit, verify each ISO clause and record objective observations.' },
      { title: 'Sync Results', desc: 'Mark each clause as C (Compliance), NC (Gap), or OFI (Improvement).' },
      { title: 'Finalize Report', desc: 'Summarize your findings and commit the record to the institutional registry.' }
    ],
    buttons: [
      { label: 'Open Evidence Log', labelShort: 'Audit', action: 'Launches the interactive ISO 21001:2018 checklist.' },
      { label: 'Print Template', labelShort: 'Template', action: 'Prints a blank log for taking notes during site inspections.' },
      { label: 'Claim Audit', labelShort: 'Claim', action: 'Assigns the itinerary entry to your auditor account.' }
    ],
    nextStep: 'Once an audit is finalized, any NC findings will automatically appear in the unit\'s Corrective Action registry.'
  },
  '/qa-reports': {
    title: 'QA Reports & CAR Registry',
    description: 'The institutional vault for audit summaries and non-conformance tracking.',
    steps: [
      { title: 'Monitor CARs', desc: 'Units: Check the registry for any Corrective Action Requests issued to your office.' },
      { title: 'Perform RCA', desc: 'Analyze the "Root Cause" of any identified gaps before proposing an action plan.' },
      { title: 'Update Progress', desc: 'Regularly update your action steps and attach evidence links to close findings.' },
      { title: 'MR Follow-up', desc: 'Provide updates on actionable decisions assigned from Management Reviews.' }
    ],
    buttons: [
      { label: 'Manage', labelShort: 'Edit', action: 'Opens the RCA and Action Plan workspace for a specific CAR.' },
      { label: 'Update Status', labelShort: 'Sync', action: 'Submits your unit\'s implementation update for QA review.' },
      { label: 'Print Registry', labelShort: 'Print', action: 'Generates the official CAR Control Register (CCR) for the site.' }
    ],
    nextStep: 'Ensure all CARs are moved to "Closed" status before the next external quality audit (EQA).'
  },
  '/academic-programs': {
    title: 'Program Compliance Registry',
    description: 'Central registry for tracking the 5 quality pillars of university degree offerings.',
    steps: [
      { title: 'Manage Workspace', desc: 'Click "Workspace" to update specific program data for the current year.' },
      { title: 'Verify COPC', desc: 'Under CHED tab, ensure the Award Date and Certificate link are updated.' },
      { title: 'Log Milestones', desc: 'Under Accreditation, record survey results and track assigned recommendations.' },
      { title: 'Batch Hub', desc: 'Use the Batch Hub for rapid headcount entry for multiple programs.' }
    ],
    buttons: [
      { label: 'Workspace', labelShort: 'Open', action: 'Enters the comprehensive 5-module compliance dashboard.' },
      { label: 'Batch Data Hub', labelShort: 'Batch', action: 'Fast-entry mode for Enrollment, Graduation, and Board stats.' },
      { label: 'Quality Profile', labelShort: 'SWOT', action: 'Analyzes program health across all monitored modules.' }
    ],
    nextStep: 'Maintain a 100% "Data Integrity Rate" to ensure the university survey roadmap remains accurate.'
  }
};
