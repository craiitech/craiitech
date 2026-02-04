'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck } from 'lucide-react';


const manualSections = [
  {
    role: 'General (For All Users)',
    sections: [
      {
        title: 'Account Registration',
        content: `
          <p>To use the portal, you must first create an account.</p>
          <ol class="list-decimal space-y-2 pl-6">
            <li>From the landing page, click the <strong>"Register"</strong> button.</li>
            <li>You can sign up using your official RSU email and a secure password, or by using the "Sign in with Google" option.</li>
            <li>Before creating an account, you must read and agree to the <strong>Data Privacy Statement</strong> by checking the corresponding box. This is a mandatory step.</li>
            <li>Click <strong>"Create an account"</strong> to complete the initial sign-up.</li>
          </ol>
        `,
      },
      {
        title: 'Completing Your Profile',
        content: `
          <p>After your initial sign-up, you will be automatically redirected to the "Complete Your Registration" page.</p>
          <ol class="list-decimal space-y-2 pl-6">
            <li><strong>Select your Campus:</strong> Choose the campus you belong to from the dropdown menu.</li>
            <li><strong>Select your Role:</strong> Choose your official role within the university.</li>
            <li><strong>Select your Unit/Office:</strong> Based on your role, you may need to select your specific unit or office. This dropdown will be populated based on the campus you selected. If you are a Campus-level official (like a Campus Director), this may not be required.</li>
            <li>Click <strong>"Update and Proceed"</strong>.</li>
          </ol>
        `,
      },
      {
          title: 'Account Verification Process',
          content: `
            <p>For security, all new accounts must be verified and activated by a system administrator.</p>
            <ol class="list-decimal space-y-2 pl-6">
                <li>After completing your profile, you will be asked to read and accept a <strong>Non-Disclosure Agreement (NDA)</strong> regarding the sensitive nature of the documents in the portal.</li>
                <li>Once you accept the NDA, your account is placed in a "Pending Verification" queue.</li>
                <li>A system administrator from the Quality Assurance Office will review your details and activate your account.</li>
                <li>You will receive an email at your RSU address once your account has been approved. You cannot log in until this approval is granted.</li>
            </ol>
          `
      },
      {
          title: 'Managing Your Profile',
          content: `
            <p>You can update your personal information after logging in.</p>
             <ol class="list-decimal space-y-2 pl-6">
                <li>Click on your user avatar in the top-right corner of the dashboard to open the user menu.</li>
                <li>Select <strong>"Profile"</strong>.</li>
                <li>On the profile page, you can edit your first and last name. Your role, campus, and unit are fixed and can only be changed by an administrator.</li>
                <li>After saving your changes, you will be automatically redirected back to the Home (Dashboard) page.</li>
            </ol>
          `
      }
    ],
  },
  {
    role: 'Employee / Unit Coordinator / Unit ODIMO',
    sections: [
        {
            title: 'Dashboard Overview',
            content: `
                <p>Your dashboard provides a quick overview of your submission status and risk management activities.</p>
                <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Stats Cards:</strong> Show your submission counts for the First and Final cycles of the current year, and your total number of approved submissions.</li>
                    <li><strong>Risk Management Overview:</strong> A summary of risk and opportunity entries for your unit, including counts of active units, open risks, and closed risks for a selected year.</li>
                    <li><strong>Submissions Overview Chart:</strong> A graph showing your submission activity over the last 12 months.</li>
                    <li><strong>Recent Activity:</strong> A list of your 5 most recent submissions and their status.</li>
                    <li><strong>Submission Checklist:</strong> The primary tool for managing your reports. It shows the status of each required document for the selected year and cycle.</li>
                </ul>
            `
        },
        {
            title: 'How to Submit a Report',
            content: `
                <p>All submissions are managed through the "New Submission / Resubmission" page.</p>
                <ol class="list-decimal space-y-2 pl-6">
                    <li>Navigate to the <strong>"Submissions"</strong> page from the sidebar and click the <strong>"New Submission / Resubmission"</strong> button.</li>
                    <li>On the checklist page, select the correct <strong>Year</strong> and <strong>Submission Cycle</strong> (First or Final).</li>
                    <li>Find the report you wish to submit in the list and click on it to expand the submission form.</li>
                    <li>Paste the <strong>Google Drive Link</strong> for your document into the input field. The system will validate the link to ensure it's accessible. For instructions on getting the correct link, click the "How to get Google Drive link" helper button.</li>
                    <li>Complete the <strong>"Final Check"</strong> checklist to confirm all details rarae correct. The "Submit Report" button will only become active once all boxes are checked.</li>
                    <li>Click <strong>"Submit Report"</strong>. Your report status will update to "Submitted" and will be sent for review.</li>
                </ol>
            `
        },
        {
            title: 'Handling a Rejected Submission',
            content: `
                <p>If your submission is rejected, you must correct and resubmit it.</p>
                 <ol class="list-decimal space-y-2 pl-6">
                    <li>Find the rejected submission in your checklist (it will be marked "Rejected").</li>
                    <li>Click the <strong>View (eye) icon</strong> to go to the submission's detail page.</li>
                    <li>On the detail page, review the feedback from the approver in the <strong>"Conversation History"</strong> card.</li>
                    <li>Prepare your corrected document and get a new Google Drive link.</li>
                    <li>Use the <strong>"Resubmit Report"</strong> form on the detail page to enter the new link and add an optional comment explaining your changes.</li>
                    <li>Click <strong>"Resubmit"</strong>. The status will change back to "Submitted", and you will be redirected back to the main Submissions page.</li>
                </ol>
            `
        },
        {
            title: 'Using the Risk & Opportunity Register',
            content: `
                <p>The Risk Register is a module for logging, tracking, and managing risks and opportunities for your unit.</p>
                 <ol class="list-decimal space-y-2 pl-6">
                    <li><strong>Logging a New Entry:</strong> Navigate to the "Risk Register" page and click "Log New Entry". Fill out the form, which is divided into steps for Identification and Analysis. You can refer to the criteria and field guide on the right side of the form. An "Action Plan" section (including OAP No., Treatment Plan, Accountable Person, and Target Date) will appear only if the calculated risk rating is Medium or High.</li>
                    <li><strong>Editing an Entry:</strong> You can edit any entry you have created by clicking the "View / Edit" action button in the table. This is also where you can add progress updates to an ongoing action plan.</li>
                    <li><strong>Closing a Risk:</strong> To close a risk, edit the entry and change its status to "Closed". A new "Post-Treatment Analysis" section will appear. You must provide written evidence of the implemented action plan, the date of implementation, and re-evaluate the risk's likelihood and consequence to demonstrate the effectiveness of your treatment.</li>
                </ol>
            `
        }
    ]
  },
  {
      role: 'Campus Director, VP & Campus ODIMO (Approvers)',
      sections: [
          {
              title: 'Approvals Page',
              content: `
                <p>The "Approvals" page, accessible from the sidebar, is your primary workspace for reviewing submissions. Note: This sidebar link is generally for campus-level supervisors and above. Unit ODIMOs typically review submissions via their dashboard or the main Submissions page.</p>
                 <ul class="list-disc spacey-y-2 pl-6">
                    <li>This page lists all submissions with a "Submitted" status from users within your assigned scope (e.g., your campus).</li>
                    <li>You will not see your own submissions in this queue, as self-approval is not permitted.</li>
                </ul>
              `
          },
          {
              title: 'Approving or Rejecting a Submission',
              content: `
                 <p>You can act on submissions from the "Approvals" page or the submission detail page.</p>
                 <ol class="list-decimal space-y-2 pl-6">
                    <li><strong>To Approve:</strong> Click the green <strong>Checkmark icon</strong> on the Approvals page, or click the "Approve" button on the detail page. After approving from the detail page, you will be redirected back to the approvals list.</li>
                    <li><strong>To Reject:</strong> Click the red <strong>X icon</strong>. A dialog box will appear, where you are required to enter clear and constructive feedback explaining the reason for the rejection. This feedback is crucial for the submitter to make corrections.</li>
                </ol>
              `
          },
          {
              title: 'Campus Dashboard & Settings',
              content: `
                <p>Your dashboard provides a high-level overview of your entire campus. You also have special permissions on the "Settings" page.</p>
                 <ul class="list-disc spacey-y-2 pl-6">
                    <li><strong>Interactive Dashboard:</strong> The dashboard includes cards for tracking "Incomplete Submissions". You can click on any unit in this list to immediately see a detailed breakdown of their submission status for the year in a new card on the right.</li>
                    <li><strong>Campus Directors (Unit Management):</strong> Can manage units for their campus. This includes creating new units specific to the campus or assigning existing, unassigned university-wide units to their campus.</li>
                    <li><strong>Campus ODIMOs (Announcements):</strong> Can post a campus-wide announcement. This message will appear in an alert box on the dashboard for every user registered under that campus.</li>
                </ul>
              `
          },
          {
              title: 'Monitoring the Risk Register',
              content: `
                 <p>As a supervisor, you have read-only access to the Risk & Opportunity Register for all units within your scope (e.g., your campus for a Director, or your assigned units for a VP). This allows you to monitor risks and action plans without altering the data entered by the units. You can also view yearly statistics on your dashboard.</p>
              `
          }
      ]
  },
  {
      role: 'Administrator',
      sections: [
          {
              title: 'System Administration & User Management',
              content: `
                <p>Administrators have full control over the system via the "Settings" page.</p>
                 <ul class="list-disc spacey-y-2 pl-6">
                    <li><strong>User Management:</strong> View all users and filter by status ("All", "Inactive", "Active").</li>
                    <li><strong>Account Activation/Deactivation:</strong> You can activate new user accounts that are pending verification or deactivate existing accounts (e.g., if a user has resigned). Deactivated users cannot log in. This is done from the actions menu for each user.</li>
                    <li><strong>Profile Editing:</strong> You can edit any user's profile information, including their role, campus, and unit assignment.</li>
                    <li><strong>Campus, Unit, Role, and Cycle Management:</strong> Create and manage the foundational data for the system, such as adding new campuses, defining new user roles, or setting the dates for submission cycles.</li>
                    <li><strong>Campus Settings:</strong> Post announcements for any campus in the system, or post a global announcement to all users.</li>
                </ul>
              `
          },
          {
              title: 'Administrator Dashboard Features',
              content: `
                <p>Your dashboard has unique widgets for a system-wide overview.</p>
                 <ul class="list-disc spacey-y-2 pl-6">
                    <li><strong>Leaderboard:</strong> This card shows a ranked list of "Top Performing Units" that have completed 50% or more of their required submissions for the year, complete with a five-star rating based on their completion percentage.</li>
                    <li><strong>Interactive Incomplete Submissions Card:</strong> Like supervisors, you can click on any unit in the "Incomplete Submissions" or "Units Without Submissions" cards to instantly view that unit's detailed submission status for the year on the right side of the dashboard.</li>
                 </ul>
              `
          },
          {
              title: 'Secure Submission Deletion',
              content: `
                <p>As an admin, you have the ability to permanently delete any submission.</p>
                 <ol class="list-decimal space-y-2 pl-6">
                    <li>Navigate to the main <strong>"Submissions"</strong> page.</li>
                    <li>In the "Actions" column for each submission, you will see a <strong>Delete (trash can) icon</strong>.</li>
                    <li>Clicking this icon opens a confirmation dialog. For safety, this dialog will present a unique challenge phrase (e.g., "delete-1234").</li>
                    <li>You must type this exact phrase into the input field to enable the final "Delete Submission" button.</li>
                    <li>Once confirmed, the action is irreversible and is recorded in the Audit Log.</li>
                </ol>
              `
          },
          {
              title: 'Audit Log',
              content: `
                <p>The "Audit Log" page, accessible only to administrators, provides a complete and immutable history of all significant actions taken within the application. This includes user logins, registrations, submission creations/updates, risk register entries, and administrative changes, providing full traceability for security and compliance purposes.</p>
              `
          }
      ]
  }
];

export default function UserManualPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">User Manual</CardTitle>
        <CardDescription>
          A comprehensive guide to using the RSU EOMS Submission Portal. Find instructions tailored to your specific role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="mb-6">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>For Authorized Use Only</AlertTitle>
          <AlertDescription>
            This portal is for the exclusive use of bona fide and selected employees of Romblon State University involved in the EOMS process. It is not intended for general public use.
          </AlertDescription>
        </Alert>

        <Accordion type="multiple" className="w-full">
          {manualSections.map((roleSection) => (
            <div key={roleSection.role}>
              <h3 className="mt-8 mb-4 text-2xl font-semibold tracking-tight border-b pb-2">
                {roleSection.role}
              </h3>
              {roleSection.sections.map((section, index) => (
                <AccordionItem key={`${roleSection.role}-${index}`} value={`${roleSection.role}-${index}`}>
                  <AccordionTrigger className="text-lg">{section.title}</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground space-y-3" dangerouslySetInnerHTML={{ __html: section.content }} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </div>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
