
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    role: 'General',
    questions: [
      {
        question: 'How do I register for an account?',
        answer:
          'Click the "Register" button on the homepage. You can sign up using your email and a password or with your Google account. After initial signup, you will be prompted to complete your registration by selecting your campus, role, and unit.',
      },
      {
        question: 'What happens after I complete my registration?',
        answer:
          'Your account will be placed in a "pending" state. An administrator must verify and approve your account before you can log in and access the portal. You will be notified by email once your account is active.',
      },
       {
        question: 'I forgot my password. How can I reset it?',
        answer:
          'On the login page, there is a "Forgot Password" link. Click it and follow the instructions to reset your password via email.',
      },
    ],
  },
  {
    role: 'Employee / Unit Coordinator',
    questions: [
      {
        question: 'How do I submit a report?',
        answer:
          'Navigate to the "Submissions" page and click "New Submission". On the submission checklist page, select the year and cycle, then click on the report type you wish to submit. This will open a form where you can paste the Google Drive link to your document and add optional comments.',
      },
      {
        question: 'How do I check the status of my submissions?',
        answer:
          'The Home page provides a "Submission Checklist" tab that shows the status of each required document (Not Submitted, Submitted, Approved, Rejected) for the selected year and cycle. You can also view a complete history on the "Submissions" page.',
      },
      {
        question: 'What do the different submission statuses mean?',
        answerBlocks: [
          { type: 'list-item', content: '<strong>Not Submitted:</strong> You have not uploaded this report for the selected period.' },
          { type: 'list-item', content: '<strong>Submitted:</strong> The report has been sent and is awaiting review.' },
          { type: 'list-item', content: '<strong>Approved:</strong> The submission has been approved by the designated approver.' },
          { type: 'list-item', content: '<strong>Rejected:</strong> The submission was not accepted. You must review the feedback, make corrections, and resubmit.' },
        ],
      },
      {
        question: 'My submission was rejected. What do I do?',
        answer:
          'Go to the "Submissions" page and find the rejected report. Click the message icon to view the feedback from the approver. You can also go to the submission detail page to view comments. Once you have made the necessary corrections, go to the submission detail page to resubmit a new Google Drive link.',
      },
    ],
  },
  {
    role: 'Unit ODIMO',
    questions: [
      {
        question: 'How do I review submissions from my unit?',
        answer:
          'Navigate to the "Approvals" page. You will see a queue of submissions from your unit that are awaiting your review. You can click on the "View Details" (eye) icon to inspect a submission.',
      },
      {
        question: 'How do I approve or reject a submission?',
        answer:
          'On the "Approvals" page, you can directly approve a submission using the green checkmark button. To reject, click the red "X" button, which will open a dialog where you must provide feedback explaining the reason for rejection.',
      },
       {
        question: 'Can I approve my own submissions?',
        answer:
          'No, the system filters out your own submissions from your approval queue to ensure a proper review process.',
      },
    ],
  },
  {
    role: 'Campus Director / Campus ODIMO',
    questions: [
      {
        question: 'How can I monitor the submission progress of my campus?',
        answer:
          'Your Home page provides several tools. The "Submission Status per Unit" card shows the completion progress for each unit in your campus. The "Incomplete Submissions by Campus" card highlights units that are falling behind.',
      },
      {
        question: 'How do I manage settings for my campus?',
        answer:
          'Navigate to the "Settings" page. As a Campus Supervisor, you can post a campus-wide announcement that will appear on the Home page for all users in your campus.',
      },
        {
        question: 'Can I see all submissions from my campus?',
        answer:
          'Yes, the "Submissions" page will show you a complete history of all submissions from all units within your assigned campus, allowing you to filter and review as needed.',
      },
    ],
  },
  {
    role: 'Administrator',
    questions: [
      {
        question: 'How do I manage users?',
        answer:
          'Go to the "Settings" page and click on the "Users" tab. Here you can view all users, filter by status (Verified, Pending), verify new user registrations, edit user details (role, campus, unit), and delete users.',
      },
      {
        question: 'How do I manage the system\'s campuses, units, and roles?',
        answer:
          'On the "Settings" page, you will find tabs for "Campuses," "Units," and "Roles." You can add new entries in each of these categories. For units, you can also assign them to specific campuses.',
      },
       {
        question: 'How does the approval workflow operate?',
        answer:
          'The primary approval workflow is: Employee/Unit Coordinator submits -> Unit ODIMO approves/rejects. As an Admin, you have override privileges and can view and manage all submissions across all campuses and units from the "Approvals" page.',
      },
    ],
  },
];


export default function HelpPage() {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Support Center</h2>
        <p className="text-muted-foreground">
          Find answers to common questions about using the RSU EOMS Portal.
        </p>
      </div>

      <Accordion type="multiple" className="w-full">
        {faqs.map((section) => (
          <div key={section.role}>
            <h3 className="mt-6 mb-2 text-xl font-semibold tracking-tight">
              {section.role}
            </h3>
            {section.questions.map((faq, index) => (
              <AccordionItem key={`${section.role}-${index}`} value={`${section.role}-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none text-muted-foreground space-y-2">
                    {faq.answer && <p>{faq.answer}</p>}
                    {faq.answerBlocks && (
                      <ul className="list-disc pl-5 space-y-1">
                        {faq.answerBlocks.map((block, i) => (
                          <li key={i} dangerouslySetInnerHTML={{ __html: block.content }} />
                        ))}
                      </ul>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </div>
        ))}
      </Accordion>
    </div>
  );
}
