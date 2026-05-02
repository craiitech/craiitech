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
    role: 'Account Security & Data Privacy (RA 10173)',
    questions: [
      {
        question: 'Can I delete my account?',
        answer: 'Yes. In compliance with the Data Privacy Act of 2012 (RA 10173), users have the "Right to Erasure". You can permanently delete your account through the Profile page under the "Danger Zone" section. This requires your current password for security verification.',
      },
      {
        question: 'What happens to my submissions if I delete my account?',
        answer: 'While your personal authentication and profile are removed, all "Evidence Logs", "Submissions", and "Activity Logs" are preserved in the institutional registry. These records stay linked to your institutional identity string to maintain the integrity of university quality audits.',
      },
    ],
  },
  {
    role: 'App Installation & Printing',
    questions: [
      {
        question: 'How do I install the portal as an App on my device?',
        answer: 'The RSU EOMS Portal is a Progressive Web App (PWA). When you log in, the system may prompt you with an installation dialog. You can also click the "Install" icon in your browser address bar (Chrome/Edge) or "Add to Home Screen" (Safari on iOS) to run the portal as a standalone window with a desktop shortcut.',
      },
      {
        question: 'What is the required paper size for printing Audit Evidence Logs?',
        answer: 'Institutional standards require all IQA Evidence Logs to be printed on Folio (8.5" x 13") paper. The system is hard-coded to enforce 0.5-inch margins and 11pt/12pt typography to ensure professional archival quality.',
      },
    ],
  },
  {
    role: 'SSL & HTTPS Security',
    questions: [
      {
        question: 'How do I use Let\'s Encrypt SSL for the portal domain?',
        answer: 'If the portal is hosted on a private Linux VPS, you should use Certbot to manage SSL:',
        answerBlocks: [
          { content: '<strong>Nginx Setup:</strong> Run <code>sudo certbot --nginx -d eoms.rsu.edu.ph</code> to automatically configure HTTPS.' },
          { content: '<strong>Auto-Renewal:</strong> Let\'s Encrypt certificates last 90 days. Test the auto-renewal process with <code>sudo certbot renew --dry-run</code>.' },
          { content: '<strong>Firebase Hosting:</strong> If using Firebase App Hosting or standard Firebase Hosting, SSL is provisioned automatically and requires no manual Certbot setup.' }
        ]
      }
    ]
  },
  {
    role: 'Accessibility & Inclusivity (PWD Support)',
    questions: [
      {
        question: 'What accessibility features are available for PWD users?',
        answer: 'The portal is designed to be inclusive and offers several tools to assist users with visual or cognitive disabilities:',
        answerBlocks: [
          { content: '<strong>Font Size Scaling:</strong> Adjust the system-wide text size from 80% to 140% for better readability.' },
          { content: '<strong>High Contrast Mode:</strong> Sharpens colors and borders for users with low vision.' },
          { content: '<strong>Dyslexic-Friendly Font:</strong> Switches to specialized typography to improve reading for users with dyslexia.' },
          { content: '<strong>Reduced Motion:</strong> Disables UI animations to assist users with vestibular disorders.' }
        ]
      },
      {
        question: 'How do I access and enable these accessibility features?',
        answer: 'To personalize your experience, log in to the portal and navigate to <strong>Profile</strong> from the top-right user menu. Scroll down to the <strong>Accessibility & Inclusivity</strong> section where you can adjust the font slider or toggle specific modes. Changes are saved automatically to your institutional profile.'
      }
    ]
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