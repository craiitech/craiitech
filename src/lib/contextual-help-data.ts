/**
 * @fileOverview Rich step-by-step guidance data for RSU EOMS Portal modules.
 * Updated: Added comprehensive GAD Corner tab-specific guidance.
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
};
