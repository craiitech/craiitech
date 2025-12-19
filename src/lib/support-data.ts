'use client';

export const faqs = [
  {
    role: 'General',
    questions: [
      {
        question: 'Who can use this application?',
        answer:
          'This application is not for general use. Access is restricted to bona fide and selected employees of Romblon State University who are directly involved in the Educational Organizations Management System (EOMS) submission and review process. All accounts are subject to verification and approval by the Quality Assurance Office.',
      },
      {
        question: 'How do I register for an account?',
        answer:
          'If you are an authorized employee, click the "Register" button on the homepage. You must sign up using your official RSU email. You must agree to the Data Privacy Statement to proceed.',
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
    role: 'Employee / Unit Coordinator / Unit ODIMO',
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
        answer: 'The statuses are: Not Submitted (you have not uploaded the report), Submitted (sent for review), Approved (the submission was accepted), and Rejected (not accepted, requires correction).',
      },
      {
        question: 'My submission was rejected. What do I do?',
        answer:
          'Find the rejected submission on your Submissions page or Home dashboard and click the "View" (eye) icon. On the detail page, you can read the rejection comments in the "Conversation History" card. Use the "Resubmit Report" form on the same page to provide a new, corrected Google Drive link.',
      },
    ],
  },
  {
    role: 'Campus Director / Campus ODIMO',
    questions: [
      {
        question: 'How do I review submissions from my campus?',
        answer:
          'Navigate to the "Approvals" page. You will see a queue of submissions from your campus that are awaiting your review. You can click on the "View" button to inspect the submission details and document preview.',
      },
      {
        question: 'How do I approve or reject a submission?',
        answer:
          'On the "Approvals" page, you can quickly approve with the green checkmark button. To reject, click the red "X" button, which opens a dialog where you must provide feedback. Alternatively, you can manage approvals from the submission\'s detail page.',
      },
      {
        question: 'How can I monitor the submission progress of my campus?',
        answer:
          'Your Home page provides several dashboard cards and analytics. "Submission Status per Unit" shows the completion progress for each unit, and the "Analytics" tab provides charts for submissions by unit and status.',
      },
       {
        question: 'Can I approve my own submissions?',
        answer:
          'No, the system automatically filters your own submissions out of your approval queue to ensure a proper review process.',
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
