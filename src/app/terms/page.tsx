
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
        <CardDescription>
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-6">
        <p>
          Welcome to the Romblon State University (RSU) Educational Organizations Management System (EOMS) Submission Portal. These terms and conditions outline the rules and regulations for the use of this portal. By accessing and using this portal, you accept these terms and conditions in full. Do not continue to use the RSU EOMS Submission Portal if you do not accept all of the terms and conditions stated on this page.
        </p>

        <section>
          <h3 className="text-xl font-semibold text-card-foreground">1. User Accounts and Registration</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Eligibility:</strong> Access to this portal is restricted to authorized personnel of Romblon State University.</li>
            <li><strong>Account Creation:</strong> You must register using your official RSU-provided email address. Providing false or misleading information may result in account termination.</li>
            <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You must notify the Quality Assurance Office immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
            <li><strong>Account Verification:</strong> All new accounts are subject to verification and approval by a system administrator. Access to the portal is granted only after successful verification.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-card-foreground">2. User Roles and Responsibilities</h3>
          <p>Your permissions and access level are determined by the role assigned to you by the administrator. By using this portal, you agree to perform only the actions appropriate for your role.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Employee / Unit Coordinator:</strong> Responsible for the timely and accurate submission of required documents. You are accountable for the content and integrity of the files you submit.</li>
            <li><strong>Unit ODIMO / Campus Director / Approver:</strong> Responsible for reviewing submissions from your designated unit or campus. You must provide clear and constructive feedback for any rejected submissions.</li>
            <li><strong>Administrator:</strong> Responsible for the overall management of the portal, including user accounts, roles, and system settings. Administrators have the authority to manage all data within the system for maintenance and security purposes.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-card-foreground">3. Acceptable Use Policy</h3>
          <p>You agree not to use the portal for any of the following:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Any purpose that is unlawful, illegal, fraudulent, or harmful.</li>
            <li>To submit, store, or transmit any data that is malicious, contains viruses, or is otherwise technologically harmful.</li>
            <li>To access or attempt to access any part of the portal, data, or user accounts for which you do not have explicit permission.</li>
            <li>To share confidential information obtained from the portal with unauthorized individuals, in accordance with the Non-Disclosure Agreement.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-card-foreground">4. Document Submissions and Content</h3>
           <ul className="list-disc pl-6 space-y-2">
            <li><strong>File Format and Links:</strong> All submissions must be made via a Google Drive link pointing to the correct document. You are responsible for ensuring the link is accessible ("Anyone with the link can view") to the approvers. The system uses an AI service to perform a basic check for link accessibility, but the final responsibility lies with the user.</li>
            <li><strong>Intellectual Property:</strong> You retain ownership of the content you submit. However, by submitting, you grant Romblon State University a license to use, store, review, and manage these documents for the purposes of EOMS compliance, auditing, and quality assurance.</li>
            <li><strong>Content Integrity:</strong> You warrant that all submitted documents are accurate, complete, and owned by you or that you have the right to submit them.</li>
          </ul>
        </section>
        
        <section>
            <h3 className="text-xl font-semibold text-card-foreground">5. Termination</h3>
            <p>
                We may terminate or suspend your access to the portal immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms and Conditions. Upon termination, your right to use the portal will immediately cease.
            </p>
        </section>

        <section>
            <h3 className="text-xl font-semibold text-card-foreground">6. Disclaimer and Limitation of Liability</h3>
             <ul className="list-disc pl-6 space-y-2">
                <li>The portal is provided on an "AS IS" and "AS AVAILABLE" basis. Romblon State University makes no warranties, expressed or implied, and hereby disclaims all other warranties.</li>
                <li>In no event shall Romblon State University, nor its developers or administrators, be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the portal.</li>
            </ul>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-card-foreground">7. Changes to Terms</h3>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms and Conditions on this page. Your continued use of the portal after any such changes constitutes your acceptance of the new Terms and Conditions.
          </p>
        </section>

        <section>
            <h3 className="text-xl font-semibold text-card-foreground">8. Governing Law</h3>
            <p>
                These Terms shall be governed and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions.
            </p>
        </section>
      </CardContent>
    </Card>
  );
}
