
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
          'Click the "Register" button on the homepage. You can sign up using your RSU email and a password or with your Google account. You must agree to the Data Privacy Statement to proceed.',
      },
      {
        question: 'What happens after I sign up?',
        answer:
          'After initial signup, you will be redirected to complete your registration by selecting your Campus, Role, and Unit. Once submitted, you must agree to a Non-Disclosure Agreement (NDA). Your account will then be placed in a "pending" state. An administrator from the QA Office must verify and approve your account before you can log in and access the portal. You will be notified by email once your account is active.',
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
          'Navigate to the "Submissions" page and click the "New Submission" button. On the next page, you can select a year and cycle, then click on any report in the checklist to open the submission form. You must fill in the Google Drive link and check all items in the "Final Check" list before the "Submit" button is enabled.',
      },
      {
        question: 'How do I check the status of my submissions?',
        answer:
          'The Home page provides a "Submission Checklist" tab that shows the status (Not Submitted, Submitted, Approved, Rejected) of each required document for the selected year and cycle. You can also view a complete history on the "Submissions" page.',
      },
      {
        question: 'What do the different submission statuses mean?',
        answerBlocks: [
          { type: 'list-item', content: '<strong>Not Submitted:</strong> You have not uploaded this report for the selected period.' },
          { type: 'list-item', content: '<strong>Submitted:</strong> The report has been sent and is awaiting review from your Unit ODIMO.' },
          { type: 'list-item', content: '<strong>Approved:</strong> The submission has been reviewed and approved.' },
          { type: 'list-item', content: '<strong>Rejected:</strong> The submission was not accepted. You must review the feedback, make corrections, and resubmit.' },
        ],
      },
      {
        question: 'My submission was rejected. What do I do?',
        answer:
          'Find the rejected submission on your Submissions page or Home dashboard and click the "View" (eye) icon. On the detail page, you can read the rejection comments in the "Conversation History" card. Use the "Resubmit Report" form on the same page to provide a new, corrected Google Drive link.',
      },
    ],
  },
  {
    role: 'Unit ODIMO',
    questions: [
      {
        question: 'How do I review submissions from my unit?',
        answer:
          'Navigate to the "Approvals" page. You will see a queue of submissions from your unit that are awaiting your review. You can click on the "View" button to inspect the submission details and document preview.',
      },
      {
        question: 'How do I approve or reject a submission?',
        answer:
          'On the "Approvals" page, you can quickly approve with the green checkmark button. To reject, click the red "X" button, which opens a dialog where you must provide feedback. Alternatively, you can manage approvals from the submission\'s detail page.',
      },
       {
        question: 'Can I approve my own submissions?',
        answer:
          'No, the system automatically filters your own submissions out of your approval queue to ensure a proper review process.',
      },
    ],
  },
  {
    role: 'Campus Director / Campus ODIMO',
    questions: [
      {
        question: 'How can I monitor the submission progress of my campus?',
        answer:
          'Your Home page provides several dashboard cards. "Submission Status per Unit" shows the completion progress for each unit. "Incomplete Submissions by Campus" highlights units that are falling behind on their required reports for the year.',
      },
      {
        question: 'How do I manage campus-specific settings?',
        answer:
          'Navigate to the "Settings" page. As a Campus Director, you can create new units or assign existing unassigned units to your campus. As a Campus ODIMO, you can post a campus-wide announcement that will appear on the dashboard for all users in your campus.',
      },
        {
        question: 'Can I see all submissions from my campus?',
        answer:
          'Yes, the "Submissions" page will show you a complete history of all submissions from all units within your assigned campus, allowing you to filter and review as needed. The "Analytics" tab on your dashboard also provides charts for submissions by unit and status.',
      },
    ],
  },
  {
    role: 'Administrator',
    questions: [
      {
        question: 'How do I manage users?',
        answer:
          'Go to the "Settings" page and click on the "Users" tab. Here you can view all users, filter by status (Pending, Verified), verify new user registrations by clicking "Verify User", edit user details (role, campus, unit), and delete users.',
      },
      {
        question: 'How do I manage the system\'s campuses, units, and roles?',
        answer:
          'On the "Settings" page, you will find tabs for "Campuses," "Units," and "Roles." You can add new entries in each of these categories. When managing units, you can also assign a unit to one or more campuses.',
      },
       {
        question: 'How do I delete a submission?',
        answer:
          'On the "Submissions" page, a delete icon (trash can) is visible to you in the actions column for each submission. Clicking it will open a confirmation dialog. For security, you must type the randomly generated confirmation phrase (e.g., "delete-1234") into the input field to enable and finalize the deletion.',
      },
       {
        question: 'How can I view the audit trail?',
        answer:
          'Navigate to the "Audit Log" page from the sidebar. This page provides an immutable, chronological record of all significant user actions, such as logins, submissions, and administrative changes.',
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
