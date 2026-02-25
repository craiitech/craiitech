
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck, BookOpen, ClipboardCheck, FileText, TrendingUp, Search } from 'lucide-react';

const manualSections = [
  {
    role: 'General (For All Users)',
    sections: [
      {
        title: 'Document Control & Revision Logic',
        content: `
          <p>Every document submitted to the portal is subject to <strong>ISO Document Control</strong> standards:</p>
          <ul class="list-disc space-y-2 pl-6">
            <li><strong>Control Numbers:</strong> Generated automatically based on Unit Prefix, Revision No., and Date.</li>
            <li><strong>Revisions:</strong> Initial submissions start at <strong>Revision 00</strong>. Any update or resubmission increments this (Rev 01, 02, etc.).</li>
            <li><strong>Fuzzy Matching:</strong> The system automatically identifies documents based on content (e.g., a file named "2025 SWOT" is correctly mapped to "SWOT Analysis").</li>
          </ul>
        `,
      },
      {
        title: 'The Support Agent (Chatbot)',
        content: `
          <p>Accessible via the message icon in the bottom-right corner of your dashboard.</p>
          <ul class="list-disc space-y-2 pl-6">
            <li>The AI agent is trained on this manual and can answer specific questions about workflows.</li>
            <li>It can suggest risk mitigation strategies using the <strong>AI Treatment Suggestion</strong> tool in the Risk Register.</li>
          </ul>
        `,
      }
    ],
  },
  {
    role: 'Unit Coordinators & ODIMOs',
    sections: [
        {
            title: 'Submitting the 6 Core EOMS Documents',
            content: `
                <p>The system focuses on the 6 primary strategic planning documents:</p>
                <ol class="list-decimal space-y-2 pl-6">
                    <li>SWOT Analysis</li>
                    <li>Needs and Expectation of Interested Parties</li>
                    <li>Operational Plan</li>
                    <li>Quality Objectives Monitoring</li>
                    <li>Risk and Opportunity Registry</li>
                    <li>Risk and Opportunity Action Plan</li>
                </ol>
                <p class="mt-2"><strong>Note on the Action Plan:</strong> If your Risk Registry entry is rated <strong>Low</strong>, the Action Plan becomes "Not Applicable" (N/A) and is not required for your compliance score.</p>
            `
        },
        {
            title: 'Managing the Risk Register',
            content: `
                <p>The Digital Risk Register is a two-step process:</p>
                <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Step 1 (Analysis):</strong> Determine Likelihood and Consequence (1-5). Magnitude = L x C.</li>
                    <li><strong>Step 2 (Treatment):</strong> Required for ratings of 5 or higher. Use the "AI Suggest" button for professional ISO-aligned strategies.</li>
                    <li><strong>Closing Risks:</strong> Change status to "Closed" and provide <strong>Post-Treatment Analysis</strong> (Residual Risk) and evidence of implementation.</li>
                </ul>
            `
        },
        {
            title: 'Program Monitoring Workspace',
            content: `
                <p>Units offering academic programs must maintain the <strong>Compliance Workspace</strong>:</p>
                <ul class="list-disc space-y-2 pl-6">
                    <li><strong>CHED & RQAT:</strong> Upload COPC certificates and BOR resolutions.</li>
                    <li><strong>Accreditation:</strong> Track AACCUP levels and next survey schedules.</li>
                    <li><strong>Faculty:</strong> Maintain a disaggregated registry of Core and Teaching faculty.</li>
                    <li><strong>Outcomes:</strong> Log graduation counts and Tracer Study results.</li>
                </ul>
            `
        }
    ]
  },
  {
      role: 'Campus Directors & Supervisors',
      sections: [
          {
              title: 'Generating Formal Notices',
              content: `
                <p>Supervisors can enforce compliance using the <strong>Notices System</strong>:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Notice of Compliance:</strong> A certificate-style notice for units with 100% verified approval.</li>
                    <li><strong>Notice of Non-Compliance:</strong> A formal memo listing specific missing or unapproved documents.</li>
                    <li>Both are accessible via the <strong>Submissions Hub -> Unit Explorer</strong>.</li>
                </ul>
              `
          },
          {
              title: 'Decision Support Dashboards',
              content: `
                <p>Use visual analytics to drive institutional growth:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Maturity Radar:</strong> Compares your campus against university-wide quality benchmarks.</li>
                    <li><strong>Compliance Heatmap:</strong> Identifies which units are struggling with specific report types.</li>
                    <li><strong>Leaderboard:</strong> Highlights top-performing units based on <strong>Verified Approvals</strong>.</li>
                </ul>
              `
          }
      ]
  },
  {
      role: 'Administrators',
      sections: [
          {
              title: 'Risk Registry Bridge',
              content: `
                <p>To ensure no risk data is missed:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li>Open any "Risk and Opportunity Registry" submission.</li>
                    <li>Click <strong>"Record in Risk Registry"</strong>.</li>
                    <li>The system pre-fills the unit details, allowing you to log the risk data directly from the document into the database.</li>
                </ul>
              `
          },
          {
              title: 'IQA Strategic Planning',
              content: `
                <p>Manage the full Internal Quality Audit lifecycle:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Plan:</strong> Establish the institutional framework and lead auditor.</li>
                    <li><strong>Schedule:</strong> Provision unit-level itineraries and assigned clauses.</li>
                    <li><strong>Report:</strong> Generate the final consolidated Evidence Log sheets.</li>
                </ul>
              `
          }
      ]
  }
];

export default function UserManualPage() {
  return (
    <Card className="shadow-lg border-primary/10">
      <CardHeader className="bg-primary/5 border-b py-8">
        <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-black uppercase tracking-tight">Institutional User Manual</CardTitle>
        </div>
        <CardDescription className="text-base font-medium">
          Official operating procedures for the RSU EOMS Digital Portal (ISO 21001:2018).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl border bg-muted/20 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold uppercase">6 Core Reports</span>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold uppercase">Maturity Radar</span>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20 flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold uppercase">IQA Conduct</span>
            </div>
        </div>

        <Alert className="mb-10 bg-primary/5 border-primary/20">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <AlertTitle className="font-bold text-primary">Authorized Operations Only</AlertTitle>
          <AlertDescription className="text-sm font-medium">
            Every action performed in this portal—including logins, file views, and status changes—is recorded in the <strong>Permanent System Audit Log</strong> for institutional transparency and security.
          </AlertDescription>
        </Alert>

        <Accordion type="multiple" className="w-full space-y-4">
          {manualSections.map((roleSection) => (
            <div key={roleSection.role} className="space-y-2">
              <div className="flex items-center gap-2 mb-4 mt-8 bg-slate-50 p-2 rounded-lg border">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h3 className="text-lg font-black uppercase tracking-widest text-slate-800">
                    {roleSection.role}
                  </h3>
              </div>
              {roleSection.sections.map((section, index) => (
                <AccordionItem key={`${roleSection.role}-${index}`} value={`${roleSection.role}-${index}`} className="border rounded-lg px-4 hover:bg-muted/10 transition-colors">
                  <AccordionTrigger className="text-sm font-bold uppercase hover:no-underline">{section.title}</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground space-y-3 pt-2" dangerouslySetInnerHTML={{ __html: section.content }} />
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
