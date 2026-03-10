'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck, BookOpen, ClipboardCheck, FileText, TrendingUp, Search, Database, History, Target, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

const manualSections = [
  {
    role: 'Institutional Standards (All Users)',
    sections: [
      {
        title: 'Document Control & Revision Logic',
        content: `
          <p>The portal enforces strict ISO Document Control standards for all evidence logs:</p>
          <ul class="list-disc space-y-2 pl-6">
            <li><strong>Control Numbers:</strong> Standardized strings (e.g., RSU-UNIT-REV-DOC-DATE) generated automatically upon submission.</li>
            <li><strong>Revision Tracking:</strong> Submissions start at <strong>Revision 00</strong>. Updates to existing or rejected records increment this automatically (Rev 01, 02, etc.).</li>
            <li><strong>Draft vs. Final:</strong> Drafts are for content checking (raw docs). Finals are for official filing (signed PDFs).</li>
          </ul>
        `,
      },
      {
        title: 'Academic Year (AY) Context',
        content: `
          <p>Analytics and registries are scoped by Academic Year. Ensure you have selected the correct <strong>AY Filter</strong> in your dashboard to view the relevant compliance matrix and stats.</p>
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
                <p>The system tracks six primary strategic documents per cycle:</p>
                <ol class="list-decimal space-y-2 pl-6">
                    <li>SWOT Analysis</li>
                    <li>Needs and Expectation of Interested Parties</li>
                    <li>Operational Plan</li>
                    <li>Quality Objectives Monitoring</li>
                    <li>Risk and Opportunity Registry</li>
                    <li>Risk and Opportunity Action Plan</li>
                </ol>
                <p class="mt-2"><strong>The Action Plan Rule:</strong> If your Risk Registry entry magnitude is <strong>Low (1-4)</strong>, the Action Plan is N/A. Ratings of <strong>5-25 (Med/High)</strong> trigger a mandatory submission.</p>
            `
        },
        {
            title: 'Managing the Digital Risk Register',
            content: `
                <p>Individual risks must be encoded in the database before document submission:</p>
                <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Baseline Analysis:</strong> Determine Likelihood and Consequence (1-5). Use the <strong>AI Suggest</strong> tool for mitigation strategies.</li>
                    <li><strong>Post-Treatment:</strong> For closing risks, record the actual implementation results and residual impact.</li>
                    <li><strong>Closure:</strong> Changing status to "Closed" signifies that mitigation is complete and verified.</li>
                </ul>
            `
        },
        {
            title: 'Program Monitoring Workspace',
            content: `
                <p>Maintain five compliance pillars for degree offerings:</p>
                <ul class="list-disc space-y-2 pl-6">
                    <li><strong>CHED/RQAT:</strong> Upload COPC certificates and BOR resolutions. For phased-out programs, upload <strong>Closure Authority</strong> evidence.</li>
                    <li><strong>Accreditation:</strong> Log AACCUP levels and survey results per specialization/major.</li>
                    <li><strong>Faculty:</strong> Maintain a <strong>"SYSTEM REGISTERED USER"</strong> list with sex-disaggregated data.</li>
                    <li><strong>Outcomes:</strong> Log graduation counts, Board Exam performance, and Tracer results.</li>
                </ul>
            `
        },
        {
            title: 'Unit Forms & Records',
            content: `
                <p>Manage your unit's controlled forms roster:</p>
                <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Registration:</strong> Apply for new form enrollment using the signed <strong>DRF (Document Registration Form)</strong>.</li>
                    <li><strong>Roster Access:</strong> Only approved forms appear in the unit roster for download. All downloads are logged for quality auditing.</li>
                </ul>
            `
        }
    ]
  },
  {
      role: 'Campus Directors & Supervisors',
      sections: [
          {
              title: 'Consolidated Site Matrix',
              content: `
                <p>Oversight tools for site-level management:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Site Maturity:</strong> View aggregate performance across all units in your campus.</li>
                    <li><strong>Institutional Notices:</strong> Generate printable <strong>Notices of Compliance</strong> (for 100% parity) or <strong>Notices of Non-Compliance</strong> (to flag missing docs).</li>
                    <li><strong>Unit Explorer:</strong> Drill down into specific unit profiles to verify individual document status.</li>
                </ul>
              `
          },
          {
              title: 'Strategic Decision Support',
              content: `
                <p>Utilize visual data to drive improvements:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Survey Pipeline:</strong> Monitor color-coded quality targets and validity periods for academic programs.</li>
                    <li><strong>GAD Compliance:</strong> Track sex-disaggregated institutional outputs (Enrollment, Faculty, Graduation).</li>
                    <li><strong>Decision Resolution:</strong> Provide updates on actionable decisions assigned to your site from Management Reviews.</li>
                </ul>
              `
          }
      ]
  },
  {
      role: 'Administrators',
      sections: [
          {
              title: 'Institutional Data & Backups',
              content: `
                <p>Ensure data redundancy and external audit readiness:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Institutional Snapshot:</strong> Generate a multi-sheet XLSX file containing all registries.</li>
                    <li><strong>Audit Trail Export:</strong> Download the permanent system activity log (Who, What, When).</li>
                    <li><strong>Manual Snapshots:</strong> High-priority for <strong>ISO 21001:2018 Clause 7.5</strong> compliance.</li>
                </ul>
              `
          },
          {
              title: 'IQA Strategic Planning',
              content: `
                <p>Manage the university-wide audit lifecycle:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Framework:</strong> Establish institutional audit plans and lead auditors.</li>
                    <li><strong>Itineraries:</strong> Provision specific unit schedules and map ISO clauses to be verified.</li>
                    <li><strong>Evidence Logs:</strong> Consolidate auditor findings into final Evidence Log reports for printing.</li>
                </ul>
              `
          },
          {
              title: 'Quality Reports & CARs',
              content: `
                <p>Formal oversight documentation:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>CAR Registry:</strong> Issue and track <strong>Corrective Action Requests</strong> based on non-conformances.</li>
                    <li><strong>MR Outputs:</strong> Record decisions from Management Review sessions and assign accountability.</li>
                    <li><strong>Vault Management:</strong> Maintain the institutional archive of EQA and IQA summary reports.</li>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center gap-2 text-center">
                <FileText className="h-6 w-6 text-primary" />
                <span className="text-[9px] font-black uppercase">Core Reports</span>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center gap-2 text-center">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="text-[9px] font-black uppercase">Decision Support</span>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center gap-2 text-center">
                <ClipboardCheck className="h-6 w-6 text-primary" />
                <span className="text-[9px] font-black uppercase">IQA Conduct</span>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center gap-2 text-center">
                <Database className="h-6 w-6 text-primary" />
                <span className="text-[9px] font-black uppercase">Data Backups</span>
            </div>
        </div>

        <Alert className="mb-10 bg-primary/5 border-primary/20">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <AlertTitle className="font-bold text-primary uppercase text-xs">Security & Transparency Standards</AlertTitle>
          <AlertDescription className="text-sm font-medium">
            Every action—logins, document views, status transitions, and data exports—is recorded in the <strong>Permanent System Audit Log</strong>. This ensures institutional accountability and full traceability for external quality audits.
          </AlertDescription>
        </Alert>

        <Accordion type="multiple" className="w-full space-y-4">
          {manualSections.map((roleSection) => (
            <div key={roleSection.role} className="space-y-2">
              <div className="flex items-center gap-2 mb-4 mt-8 bg-slate-50 p-3 rounded-lg border">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="text-lg font-black uppercase tracking-widest text-slate-800">
                    {roleSection.role}
                  </h3>
              </div>
              {roleSection.sections.map((section, index) => (
                <AccordionItem key={`${roleSection.role}-${index}`} value={`${roleSection.role}-${index}`} className="border rounded-xl px-4 hover:bg-muted/10 transition-colors bg-white">
                  <AccordionTrigger className="text-xs font-black uppercase hover:no-underline py-4 text-slate-700">{section.title}</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground space-y-3 pt-2 pb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.content }} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </div>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter className="bg-muted/10 border-t py-6 px-8">
        <div className="flex items-start gap-4">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
                <p className="text-xs font-black uppercase text-slate-800">Technical Support</p>
                <p className="text-xs text-muted-foreground font-medium">
                    For technical issues, bug reports, or access resets, please contact the <strong>Center for Research in Artificial Intelligence and Information Technologies (CRAIITech)</strong> or use the internal Chatbot agent available on your dashboard.
                </p>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
