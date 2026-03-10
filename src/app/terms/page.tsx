'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <Card className="shadow-lg border-primary/10">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="text-3xl font-black uppercase tracking-tight">Terms and Conditions</CardTitle>
        <CardDescription className="font-bold">
          Official Operating Procedures for the RSU EOMS Digital Portal
        </CardDescription>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-8 pt-8">
        <p className="leading-relaxed">
          Welcome to the Romblon State University (RSU) Educational Organizations Management System (EOMS) Submission Portal. These terms outline the rules for using this portal. By accessing this system, you accept these terms in full.
        </p>

        <section className="space-y-3">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b pb-2">1. User Accounts & Institutional Responsibility</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Eligibility:</strong> Access is strictly restricted to verified personnel of Romblon State University.</li>
            <li><strong>Authentication:</strong> You must use your official RSU-provided email address. Sharing credentials with unauthorized persons is a violation of university security protocols.</li>
            <li><strong>Accessibility:</strong> The portal provides accessibility tools (Font Scaling, High Contrast, etc.) to ensure inclusivity. Users are encouraged to utilize these tools to meet their specific needs.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b pb-2">2. Workflow & Document Integrity</h3>
          <p>Users are accountable for the accuracy and completeness of all evidence logs submitted. Submissions must adhere to the **Complete Staff Work (CSW)** standard.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Drafts:</strong> "Draft" mode is intended for preliminary review and does not constitute a final compliance record.</li>
            <li><strong>Revisions:</strong> The system automatically increments revision numbers (Rev 00, 01, etc.). Users must ensure the latest approved revision is always available in the unit roster.</li>
            <li><strong>Control:</strong> Document control numbers are system-generated and must be cited in all official university communications regarding EOMS.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b pb-2">3. Prohibited Conduct</h3>
          <p>Users are forbidden from:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Attempting to bypass role-based access controls or view data outside their assigned scope.</li>
            <li>Submitting false or misleading evidence to artificially inflate compliance scores.</li>
            <li>Utilizing the portal for any purpose not related to RSU's Quality Management System or institutional accreditation.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b pb-2">4. Disclaimer of Liability</h3>
          <p>
            The portal is provided "as is" for institutional management purposes. While every effort is made to ensure data integrity, RSU is not liable for data loss due to user negligence or unauthorized Google Drive link modifications.
          </p>
        </section>

        <div className="pt-8 mt-8 border-t text-[10px] uppercase font-bold text-center">
            Last Updated: February 2025 • Issued by Quality Assurance Office
        </div>
      </CardContent>
    </Card>
  );
}
